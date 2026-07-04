//! Config + shared types.

use rabex::objects::pptr::PathId;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct Config {
	pub games: Vec<GameConfig>,
}

#[derive(Deserialize)]
pub struct GameConfig {
	pub slug: String,
	#[allow(dead_code)]
	pub label: String,
	pub path: String,
}

#[derive(Serialize)]
pub struct Entry {
	pub file: String,
	pub path_id: PathId,
	pub name: String,
	pub game_object: String,
	pub hash: String,
}

/// Serialize entries to the compact on-disk `index.json`: a shared file table plus one tuple per FSM,
/// `[fileIndex, name, game_object, hash]`. `path_id` is internal-only (sort/dedup) and dropped. This
/// roughly halves the raw size vs one object-with-keys per entry — matters for mobile load/parse.
pub fn to_compact_json(entries: &[Entry]) -> Vec<u8> {
	use std::collections::HashMap;
	let mut idx: HashMap<&str, usize> = HashMap::new();
	let mut files: Vec<&str> = Vec::new();
	let mut rows: Vec<(usize, &str, &str, &str)> = Vec::with_capacity(entries.len());
	for e in entries {
		let fi = *idx.entry(e.file.as_str()).or_insert_with(|| {
			files.push(e.file.as_str());
			files.len() - 1
		});
		rows.push((fi, &e.name, &e.game_object, &e.hash));
	}
	#[derive(Serialize)]
	struct Compact<'a> {
		f: Vec<&'a str>,
		e: Vec<(usize, &'a str, &'a str, &'a str)>,
	}
	serde_json::to_vec(&Compact { f: files, e: rows }).expect("compact index serializes")
}
