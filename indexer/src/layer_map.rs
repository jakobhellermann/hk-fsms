//! Resolve PlayMaker layer-index params to their Unity layer names.
//!
//! Two halves, both built once per game:
//! - which `(action class, field)` params are layers — read from the assemblies via the
//!   `[UIHint(UIHint.Layer)]` attribute PlayMaker tags layer fields with (`UIHint.Layer == 8`).
//! - the `index → name` table — read from the `TagManager` singleton in `globalgamemanagers`.
//!
//! [`bake_layers`] then rewrites the layer-index ints in the model (single `FsmInt`s and the
//! elements of `layerMask`-style `int[]` arrays) into [`ParamValue::Layer`] carrying the name.

use std::collections::{HashMap, HashSet};
use std::path::Path;

use dotnetdll::prelude::*;
use dotnetdll::resolved::ResolvedDebug;
use dotnetdll::resolved::attribute::{FixedArg, IntegralParam};
use dotnetdll::resolved::types::Resolver;
use playmakerfsm::model::{FsmModel, ParamValue};
use rabex::objects::{ClassId, ClassIdType};
use rabex_env::Environment;
use rabex_env::rabex::typetree::TypeTreeProvider;
use rabex_env::resolver::EnvResolver;
use serde::Deserialize;

/// `HutongGames.PlayMaker.UIHint.Layer`.
const UI_HINT_LAYER: i32 = 8;

/// `(action class full name, field name)` for every field tagged `[UIHint(UIHint.Layer)]`.
pub type LayerFields = HashSet<(String, String)>;

/// Resolves type names against PlayMaker.dll — needed so attribute blobs carrying a `UIHint` enum
/// value can be decoded (the enum type lives in PlayMaker.dll, not the assembly being read).
struct UIHintResolver<'a> {
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
impl<'a> Resolver<'a> for UIHintResolver<'a> {
    type Error = TypeNotFound;
    fn find_type(
        &self,
        name: &str,
    ) -> Result<
        (
            &dotnetdll::resolved::types::TypeDefinition<'a>,
            &Resolution<'a>,
        ),
        Self::Error,
    > {
        let idx = *self
            .by_name
            .get(name)
            .ok_or_else(|| TypeNotFound(name.to_string()))?;
        Ok((&self.res[idx], self.res))
    }
}

/// Collect every `(class, field)` in `res` whose field carries `[UIHint(UIHint.Layer)]`.
fn collect_layer_fields(res: &Resolution, resolver: &UIHintResolver, out: &mut LayerFields) {
    for (_idx, td) in res.enumerate_type_definitions() {
        let class = td.type_name();
        for field in &td.fields {
            for attr in &field.attributes {
                // the only single-int-enum constructor attribute on PlayMaker fields is UIHint
                if !attr.constructor.show(res).contains("UIHint") {
                    continue;
                }
                let Ok(data) = attr.instantiation_data(resolver, res) else {
                    continue;
                };
                if let Some(FixedArg::Integral(IntegralParam::Int32(UI_HINT_LAYER))) =
                    data.constructor_args.first()
                {
                    out.insert((class.clone(), field.name.to_string()));
                }
            }
        }
    }
}

/// Build the layer-field set from the game's PlayMaker.dll + Assembly-CSharp.dll. Empty if the
/// assemblies can't be read (e.g. an IL2CPP build) — layers then simply stay numeric.
pub fn build_layer_fields(managed: &Path) -> LayerFields {
    let mut fields = LayerFields::new();
    let Ok(pm_bytes) = std::fs::read(managed.join("PlayMaker.dll")) else {
        return fields;
    };
    let cs_bytes = std::fs::read(managed.join("Assembly-CSharp.dll")).ok();

    let Ok(pm_res) = Resolution::parse(&pm_bytes, ReadOptions::default()) else {
        return fields;
    };
    let by_name = pm_res
        .enumerate_type_definitions()
        .map(|(idx, td)| (td.type_name(), idx))
        .collect();
    let resolver = UIHintResolver {
        res: &pm_res,
        by_name,
    };

    collect_layer_fields(&pm_res, &resolver, &mut fields);
    if let Some(cs_bytes) = &cs_bytes
        && let Ok(cs_res) = Resolution::parse(cs_bytes, ReadOptions::default())
    {
        collect_layer_fields(&cs_res, &resolver, &mut fields);
    }
    fields
}

#[derive(Deserialize)]
struct TagManager {
    layers: Vec<String>,
}
impl ClassIdType for TagManager {
    const CLASS_ID: ClassId = ClassId::TagManager;
}

/// `index → layer name` from the `TagManager` in `globalgamemanagers`. Empty strings (unnamed
/// layers) are kept so the index lines up with the slot.
pub fn read_layer_names<R: EnvResolver, P: TypeTreeProvider>(
    env: &Environment<R, P>,
) -> Vec<String> {
    env.globalgamemanagers()
        .and_then(|ggm| ggm.find_object_of::<TagManager>())
        .ok()
        .flatten()
        .map(|tm| tm.layers)
        .unwrap_or_default()
}

/// The named layer at `index`, or `None` for an out-of-range or unnamed slot.
fn layer_name(layers: &[String], index: i32) -> Option<&str> {
    usize::try_from(index)
        .ok()
        .and_then(|i| layers.get(i))
        .filter(|name| !name.is_empty())
        .map(String::as_str)
}

/// Rewrite layer-index ints on layer-tagged fields into [`ParamValue::Layer`] carrying the name.
pub fn bake_layers(model: &mut FsmModel<'_>, layers: &[String], fields: &LayerFields) {
    let to_layer = |index: i32| ParamValue::Layer {
        index,
        name: layer_name(layers, index).map(|n| n.to_owned().into()),
    };
    for state in &mut model.states {
        for action in &mut state.actions {
            for param in &mut action.params {
                if !fields.contains(&(action.class.to_string(), param.name.to_string())) {
                    continue;
                }
                match &mut param.value {
                    ParamValue::Int(i) => param.value = to_layer(*i),
                    ParamValue::List(elems) => {
                        for elem in elems {
                            if let ParamValue::Int(i) = elem.value {
                                elem.value = to_layer(i);
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    }
}
