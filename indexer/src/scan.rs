//! Scan a game's serialized files for PlayMakerFSM components, decode each FSM, and collect
//! content-addressed index entries.

use std::collections::BTreeMap;
use std::collections::BTreeSet;
use std::collections::HashMap;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::io::IsTerminal as _;
use std::path::Path;
use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};

use anyhow::{Context as _, Result};
use playmakerfsm::component::ComponentFsm;
use playmakerfsm::files;
use rabex_env::qualify::Qualifier;
use rabex_env::rabex::objects::pptr::PathId;
use rabex_env::rabex::tpk::TpkTypeTreeBlob;
use rabex_env::rabex::typetree::typetree_cache::sync::TypeTreeCache;
use rabex_env::scene_lookup::SceneLookup;
use rabex_env::unity::types::MonoBehaviour;
use rabex_env::{Environment, resolver::GameFiles};
use rayon::prelude::*;

use playmakerfsm::context::{self, GameContext};

use crate::config::Entry;
use crate::hierarchy::{FsmInfo, Names, Walker};
use crate::scene_lookup;
use crate::tooltip_map::{Tooltips, build_tooltips};

pub struct ScanResult {
    pub entries: Vec<Entry>,
    pub scene_names: BTreeMap<String, String>,
    pub tooltips: Tooltips,
}

/// GameObject paths of all same-file object references (`{"file": null, "target": {"kind": "Path"}}`)
/// in a serialized model, without the `@Component` suffix.
fn local_refs(value: &serde_json::Value) -> Vec<String> {
    use serde_json::Value;
    let mut out = BTreeSet::new();
    let mut stack = vec![value];
    while let Some(v) = stack.pop() {
        match v {
            Value::Object(map) => {
                if map.get("file").is_some_and(Value::is_null)
                    && let Some(target) = map.get("target")
                    && target.get("kind").and_then(Value::as_str) == Some("Path")
                    && let Some(path) = target.get("target").and_then(Value::as_str)
                {
                    out.insert(path.split_once('@').map_or(path, |(go, _)| go).to_string());
                }
                stack.extend(map.values());
            }
            Value::Array(items) => stack.extend(items),
            _ => {}
        }
    }
    out.into_iter().collect()
}

/// Scan one game version: find all PlayMakerFSM components, decode them, write content-addressed
/// JSON files into `content_dir` (skipping hashes already in `written`), and return the index entries.
pub fn scan_game(
    game_dir: &Path,
    content_dir: &Path,
    written: &Mutex<BTreeSet<String>>,
) -> Result<ScanResult> {
    let game_files = GameFiles::probe(game_dir)
        .with_context(|| format!("could not probe game at {}", game_dir.display()))?;
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

    let names = Names::read(&env)?;

    let sources = files::sources(&env)?;
    eprintln!("scanning {} files and bundles...", sources.len());

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
        let mut owners = Vec::new();
        let mut refs: Vec<Vec<String>> = Vec::new();
        let mut fsms: HashMap<PathId, FsmInfo> = HashMap::new();

        let write_content = |json: &[u8]| -> Result<String> {
            let mut hasher = DefaultHasher::new();
            json.hash(&mut hasher);
            let hash = format!("{:016x}", hasher.finish());
            if written.lock().unwrap().insert(hash.clone()) {
                std::fs::write(content_dir.join(format!("{hash}.json")), json)?;
            }
            Ok(hash)
        };

        for mb in scripts {
            let path_id = mb.path_id();
            owners.push(mb.read()?.m_GameObject);
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
            refs.push(local_refs(&serde_json::to_value(&model)?));
            let hash = write_content(&serde_json::to_vec(&model)?)?;

            fsms.insert(
                path_id,
                FsmInfo {
                    name: model.name.to_string(),
                    template: model.template_name.as_deref().map(str::to_string),
                },
            );
            local.push(Entry {
                file: file_label.clone(),
                path_id,
                name: model.name.to_string(),
                game_object,
                hash,
                hierarchy: None,
            });
        }

        // FSM infos of the whole file must be known before walking, since components below
        // an owner can be FSMs themselves.
        let walker = Walker {
            names: &names,
            fsms: &fsms,
        };
        let scene = SceneLookup::from_handle(handle)?;
        for ((entry, owner), refs) in local.iter_mut().zip(owners).zip(refs) {
            let root = walker
                .hierarchy(handle, owner, &entry.game_object, &refs, &scene)
                .with_context(|| format!("hierarchy of {} in {file_label}", entry.game_object))?;
            entry.hierarchy = match root {
                Some(root) => Some(write_content(&serde_json::to_vec(&root)?)?),
                None => None,
            };
        }

        entries.lock().unwrap().extend(local);
        Ok(())
    };

    let progress = std::io::stderr().is_terminal();
    let done = AtomicUsize::new(0);
    sources.par_iter().try_for_each(|source| -> Result<()> {
        let label = source.label();
        source.for_each_file(&env, |handle| scan(label.clone(), handle))?;
        let done = done.fetch_add(1, Ordering::Relaxed) + 1;
        if progress {
            eprint!("\r{done}/{}", sources.len());
        }
        Ok(())
    })?;
    if progress {
        eprintln!();
    }

    let mut entries = entries.into_inner().unwrap();
    entries.sort_by(|a, b| (&a.name, &a.file, a.path_id).cmp(&(&b.name, &b.file, b.path_id)));

    Ok(ScanResult {
        entries,
        scene_names,
        tooltips,
    })
}
