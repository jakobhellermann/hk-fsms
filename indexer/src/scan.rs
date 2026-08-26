//! Scan a game's serialized files for PlayMakerFSM components, decode each FSM, and collect
//! content-addressed index entries.

use std::collections::BTreeMap;
use std::collections::BTreeSet;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;
use std::sync::Mutex;

use anyhow::{Context as _, Result};
use playmakerfsm::component::ComponentFsm;
use playmakerfsm::files;
use rabex_env::qualify::Qualifier;
use rabex_env::rabex::tpk::TpkTypeTreeBlob;
use rabex_env::rabex::typetree::typetree_cache::sync::TypeTreeCache;
use rabex_env::unity::types::MonoBehaviour;
use rabex_env::{Environment, resolver::GameFiles};
use rayon::prelude::*;

use playmakerfsm::context::{self, GameContext};

use crate::config::Entry;
use crate::scene_lookup;
use crate::tooltip_map::{Tooltips, build_tooltips};

/// Output of a single game scan: the index entries and the set of content hashes written.
pub struct ScanResult {
    pub entries: Vec<Entry>,
    pub written: BTreeSet<String>,
    pub scene_names: BTreeMap<String, String>,
    pub tooltips: Tooltips,
}

/// Scan one game: find all PlayMakerFSM components, decode them, write content-addressed
/// JSON files, and return the index entries.
pub fn scan_game(steam_path: &str, out_dir: &Path) -> Result<ScanResult> {
    let path = shellexpand::tilde(steam_path);
    let game_files = GameFiles::probe(path.as_ref())
        .with_context(|| format!("could not probe game at {path}"))?;
    let tpk = TypeTreeCache::new(TpkTypeTreeBlob::embedded());
    let env = Environment::new(game_files, tpk);

    let managed = env.game_files.game_dir.join("Managed");
    let read = |name: &str| std::fs::read(managed.join(name)).with_context(|| name.to_string());
    // Action classes live in TeamCherry.*.dll too; the rest of Managed/ is the
    // engine and the BCL.
    let mut names = vec!["Assembly-CSharp.dll".to_string()];
    let mut found: Vec<String> = std::fs::read_dir(&managed)?
        .flatten()
        .filter_map(|entry| entry.file_name().into_string().ok())
        .filter(|name| {
            name == "Assembly-CSharp-firstpass.dll"
                || (name.starts_with("TeamCherry.") && name.ends_with(".dll"))
        })
        .collect();
    found.sort();
    names.extend(found);
    eprintln!("assemblies: PlayMaker.dll + {}", names.join(", "));
    let assemblies = names
        .into_iter()
        .map(|name| read(&name).map(|bytes| (name, bytes)))
        .collect::<Result<Vec<_>>>()?;
    let assemblies: Vec<(&str, &[u8])> = assemblies
        .iter()
        .map(|(name, bytes)| (name.as_str(), bytes.as_slice()))
        .collect();

    let game = GameContext::new(
        &read("PlayMaker.dll")?,
        &assemblies,
        context::layer_names(&env)?,
    )?;

    let tooltips = build_tooltips(&env.game_files.game_dir.join("Managed"));
    eprintln!("tooltips: {} action classes", tooltips.len());

    let scene_names = scene_lookup::build_scene_lookup(&env)?;
    eprintln!("scenes: {} names", scene_names.len());

    let sources = files::sources(&env)?;
    eprintln!("scanning {} files and bundles...", sources.len());

    let content_dir = out_dir.join("content");
    std::fs::create_dir_all(&content_dir)?;

    let written: Mutex<BTreeSet<String>> = Mutex::new(BTreeSet::new());
    let entries: Mutex<Vec<Entry>> = Mutex::new(Vec::new());

    let scan = |file_label: String,
                handle: &rabex_env::handle::SerializedFileHandle|
     -> Result<()> {
        // `scripts` reports "not in this file" as an error, and most files hold
        // no FSM at all.
        let Ok(scripts) = handle.scripts::<MonoBehaviour>("PlayMakerFSM") else {
            return Ok(());
        };
        let mut qualifier = Qualifier::new(handle);
        let mut local: Vec<Entry> = Vec::new();

        for mb in scripts {
            let path_id = mb.path_id();
            let label = qualifier
                .qualify_local(path_id)
                .with_context(|| format!("no component path for {file_label} obj:{path_id}"))?
                .to_string();
            let game_object = label
                .rsplit_once('@')
                .map(|(go, _)| go)
                .unwrap_or(&label)
                .to_string();

            let component = ComponentFsm::read(handle, path_id)?;
            let mut model = component.decode(handle)?;
            game.apply(&mut model);
            let json = serde_json::to_vec(&model)?;

            let mut hasher = DefaultHasher::new();
            json.hash(&mut hasher);
            let hash = format!("{:016x}", hasher.finish());

            let is_new = written.lock().unwrap().insert(hash.clone());
            if is_new {
                std::fs::write(content_dir.join(format!("{hash}.json")), &json)?;
            }
            local.push(Entry {
                file: file_label.clone(),
                path_id,
                name: model.name.to_string(),
                game_object,
                hash,
            });
        }

        if !local.is_empty() {
            eprintln!("  {file_label}: {} fsms", local.len());
        }
        entries.lock().unwrap().extend(local);
        Ok(())
    };

    sources.par_iter().try_for_each(|source| -> Result<()> {
        let label = source.label();
        source.for_each_file(&env, |handle| scan(label.clone(), handle))
    })?;

    let mut entries = entries.into_inner().unwrap();
    let written = written.into_inner().unwrap();
    entries.sort_by(|a, b| (&a.name, &a.file, a.path_id).cmp(&(&b.name, &b.file, b.path_id)));

    // Prune orphaned content files from earlier runs
    let mut pruned = 0usize;
    for entry in std::fs::read_dir(&content_dir)?.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let referenced = path
            .file_stem()
            .and_then(|s| s.to_str())
            .is_some_and(|stem| written.contains(stem));
        if !referenced {
            std::fs::remove_file(&path)?;
            pruned += 1;
        }
    }

    eprintln!(
        "{} fsms → {} distinct models in {} ({pruned} stale pruned), index in {} ({:.1}s)",
        entries.len(),
        written.len(),
        content_dir.display(),
        out_dir.join("index.json").display(),
        0.0,
    );

    std::mem::forget(env);
    Ok(ScanResult {
        entries,
        written,
        scene_names,
        tooltips,
    })
}
