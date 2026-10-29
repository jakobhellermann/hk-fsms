mod config;
mod scan;
mod scene_lookup;
mod tooltip_map;

use std::collections::BTreeSet;
use std::path::Path;
use std::sync::Mutex;

use anyhow::{Context as _, Result, ensure};

use config::Config;

// improves memory usage over several game versions
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;

fn main() -> Result<()> {
    let config: Config = serde_json::from_str(
        &std::fs::read_to_string("indexer/config.json").context("config.json")?,
    )?;

    for game in &config.games {
        ensure!(
            !game.versions.is_empty(),
            "{}: no versions configured",
            game.slug
        );
        let game_dir = Path::new("static/data").join(&game.slug);
        let content_dir = game_dir.join("content");
        std::fs::create_dir_all(&content_dir)?;
        let written = Mutex::new(BTreeSet::new());

        for version in &game.versions {
            let start = std::time::Instant::now();
            eprintln!("\n=== {} {} ===", game.slug, version.version);

            let depot_dir = Path::new(&config.root)
                .join(game.appid.to_string())
                .join(game.depot.to_string())
                .join(&version.manifest);
            let result = scan::scan_game(&depot_dir, &content_dir, &written)?;

            let out_dir = game_dir.join(&version.version);
            std::fs::create_dir_all(&out_dir)?;
            std::fs::write(
                out_dir.join("index.json"),
                config::to_compact_json(&result.entries),
            )?;
            std::fs::write(
                out_dir.join("scenes.json"),
                serde_json::to_vec_pretty(&result.scene_names)?,
            )?;
            std::fs::write(
                out_dir.join("tooltips.json"),
                serde_json::to_vec(&result.tooltips)?,
            )?;

            let distinct: BTreeSet<&str> = result.entries.iter().map(|e| e.hash.as_str()).collect();
            eprintln!(
                "{} fsms → {} distinct models ({:.1}s)",
                result.entries.len(),
                distinct.len(),
                start.elapsed().as_secs_f64()
            );
        }

        let versions: Vec<&str> = game.versions.iter().map(|v| v.version.as_str()).collect();
        std::fs::write(
            game_dir.join("versions.json"),
            serde_json::to_vec(&versions)?,
        )?;

        let written = written.into_inner().unwrap();
        let pruned = prune(&game_dir, &content_dir, &written, &versions)?;
        eprintln!(
            "\n{}: {} versions → {} distinct models ({pruned} stale files pruned)",
            game.slug,
            versions.len(),
            written.len()
        );
    }

    Ok(())
}

/// Remove everything under `game_dir` that no configured version references.
fn prune(
    game_dir: &Path,
    content_dir: &Path,
    written: &BTreeSet<String>,
    versions: &[&str],
) -> Result<usize> {
    let mut pruned = 0;
    for entry in std::fs::read_dir(content_dir)? {
        let path = entry?.path();
        let referenced = path
            .file_stem()
            .and_then(|s| s.to_str())
            .is_some_and(|stem| written.contains(stem));
        if !referenced {
            std::fs::remove_file(&path)?;
            pruned += 1;
        }
    }
    for entry in std::fs::read_dir(game_dir)? {
        let entry = entry?;
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };
        if entry.file_type()?.is_dir() {
            if name != "content" && !versions.contains(&name) {
                std::fs::remove_dir_all(entry.path())?;
                pruned += 1;
            }
        } else if name != "versions.json" {
            std::fs::remove_file(entry.path())?;
            pruned += 1;
        }
    }
    Ok(pruned)
}
