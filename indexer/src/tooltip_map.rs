//! Read PlayMaker `[Tooltip]` attributes straight from the game assemblies, so the UI can show each
//! action's description (class-level tooltip) and per-parameter help (field-level tooltips).
//!
//! This mirrors how [`crate::layer_map`] reads `[UIHint]`: parse PlayMaker.dll + Assembly-CSharp.dll,
//! decode the custom-attribute blob, and keep the single string argument. No decompiled source is
//! involved — the tooltips come from the same DLLs the rest of the indexer already reads.

use std::collections::{BTreeMap, HashMap};
use std::path::Path;

use dotnetdll::prelude::*;
use dotnetdll::resolved::ResolvedDebug;
use dotnetdll::resolved::attribute::{Attribute, FixedArg};
use dotnetdll::resolved::types::{Resolver, TypeDefinition};
use serde::Serialize;

use crate::enum_map::full_type_name;

/// Tooltips for one action class: the class-level description and per-field (param) help text.
#[derive(Serialize, Default)]
pub struct ActionTooltips {
    #[serde(skip_serializing_if = "Option::is_none")]
    tip: Option<String>,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    params: BTreeMap<String, String>,
}

impl ActionTooltips {
    fn is_empty(&self) -> bool {
        self.tip.is_none() && self.params.is_empty()
    }
}

/// full class name (matching a model's `action.class`) → its tooltips.
pub type Tooltips = BTreeMap<String, ActionTooltips>;

/// Resolves type names against the resolution being read — `instantiation_data` needs a resolver to
/// decode attribute blobs. A `[Tooltip]` carries only a string, so resolution is never actually hit,
/// but the API requires one.
struct SelfResolver<'a> {
    res: &'a Resolution<'a>,
    by_name: HashMap<String, TypeIndex>,
}
#[derive(Debug)]
struct TypeNotFound(String);
impl std::fmt::Display for TypeNotFound {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "type not found: {}", self.0)
    }
}
impl std::error::Error for TypeNotFound {}
impl<'a> Resolver<'a> for SelfResolver<'a> {
    type Error = TypeNotFound;
    fn find_type(&self, name: &str) -> Result<(&TypeDefinition<'a>, &Resolution<'a>), Self::Error> {
        let idx = *self
            .by_name
            .get(name)
            .ok_or_else(|| TypeNotFound(name.to_string()))?;
        Ok((&self.res[idx], self.res))
    }
}

/// The string argument of a `[Tooltip("...")]` attribute, or `None` if `attr` isn't a Tooltip.
fn tooltip_text(attr: &Attribute, resolver: &SelfResolver, res: &Resolution) -> Option<String> {
    // cheap filter first — the only PlayMaker attribute whose name contains "Tooltip" is TooltipAttribute
    if !attr.constructor.show(res).contains("Tooltip") {
        return None;
    }
    let data = attr.instantiation_data(resolver, res).ok()?;
    match data.constructor_args.first() {
        Some(FixedArg::String(Some(s))) => Some(s.to_string()),
        _ => None,
    }
}

/// Collect class + field tooltips from every type definition in `res` into `out`.
fn collect_tooltips(res: &Resolution, resolver: &SelfResolver, out: &mut Tooltips) {
    for (_idx, td) in res.enumerate_type_definitions() {
        let mut tips = ActionTooltips::default();
        for attr in &td.attributes {
            if let Some(text) = tooltip_text(attr, resolver, res) {
                tips.tip = Some(text);
                break;
            }
        }
        for field in &td.fields {
            for attr in &field.attributes {
                if let Some(text) = tooltip_text(attr, resolver, res) {
                    tips.params.insert(field.name.to_string(), text);
                    break;
                }
            }
        }
        if !tips.is_empty() {
            out.insert(full_type_name(res, td), tips);
        }
    }
}

/// Parse one assembly and merge its tooltips into `out` (a later assembly wins on a name clash).
fn add_from(bytes: &[u8], out: &mut Tooltips) {
    let Ok(res) = Resolution::parse(bytes, ReadOptions::default()) else {
        return;
    };
    let by_name = res
        .enumerate_type_definitions()
        .map(|(idx, td)| (td.type_name(), idx))
        .collect();
    let resolver = SelfResolver { res: &res, by_name };
    collect_tooltips(&res, &resolver, out);
}

/// Build the tooltip map from the game's PlayMaker.dll + Assembly-CSharp.dll. Empty if neither can be
/// read (e.g. an IL2CPP build) — the UI then simply shows no tooltips.
pub fn build_tooltips(managed: &Path) -> Tooltips {
    let mut out = Tooltips::new();
    if let Ok(bytes) = std::fs::read(managed.join("PlayMaker.dll")) {
        add_from(&bytes, &mut out);
    }
    if let Ok(bytes) = std::fs::read(managed.join("Assembly-CSharp.dll")) {
        add_from(&bytes, &mut out);
    }
    out
}
