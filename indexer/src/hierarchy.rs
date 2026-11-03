//! Extract the GameObject hierarchy below an FSM's owner: collider shapes placed in the owner's frame,
//! plus the component classes needed to categorize them.
#![allow(non_snake_case)]

use std::collections::HashMap;

use anyhow::{Context as _, Result};
use rabex_env::Environment;
use rabex_env::handle::{ObjectRefHandle, SerializedFileHandle};
use rabex_env::rabex::objects::pptr::PathId;
use rabex_env::rabex::objects::{ClassId, ClassIdType, TypedPPtr};
use rabex_env::rabex::typetree::TypeTreeProvider;
use rabex_env::resolver::EnvResolver;
use rabex_env::scene_lookup::SceneLookup;
use rabex_env::unity::types::{GameObject, Transform};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct Node {
    pub name: String,
    pub active: bool,
    pub layer: String,
    /// Custom tag from the `TagManager`; Unity's builtin tags are left out.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,
    /// This node's local space → the owner's frame, projected to 2D (see [`Affine2`]).
    pub matrix: Affine2,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub components: Vec<Component>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub colliders: Vec<Collider>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<Node>,
}

/// A MonoBehaviour on a node.
#[derive(Serialize)]
pub struct Component {
    pub class: String,
    pub enabled: bool,
    /// FSM name, for `PlayMakerFSM` components.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fsm: Option<String>,
    /// `FsmTemplate` asset name, for templated `PlayMakerFSM` components.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template: Option<String>,
}

#[derive(Serialize)]
pub struct Collider {
    #[serde(flatten)]
    pub shape: Shape,
    pub offset: (f32, f32),
    pub trigger: bool,
    pub enabled: bool,
}

#[derive(Serialize)]
#[serde(tag = "shape", rename_all = "lowercase")]
pub enum Shape {
    Box {
        size: (f32, f32),
    },
    Circle {
        radius: f32,
    },
    Capsule {
        size: (f32, f32),
        /// 0 = vertical, 1 = horizontal
        direction: i32,
    },
    Polygon {
        paths: Vec<Vec<(f32, f32)>>,
    },
    Edge {
        points: Vec<(f32, f32)>,
    },
}

#[derive(Serialize)]
pub struct Root {
    #[serde(flatten)]
    pub node: Node,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub external: Vec<External>,
}

/// A referenced GameObject outside the owner's subtree.
#[derive(Serialize)]
pub struct External {
    pub path: String,
    /// Whether all its ancestors are active.
    pub parents_active: bool,
    pub node: Node,
}

/// Layer and custom tag names from the `TagManager`.
pub struct Names {
    layers: Vec<String>,
    tags: Vec<String>,
}

#[derive(Deserialize)]
struct TagManager {
    tags: Vec<String>,
    layers: Vec<String>,
}
impl ClassIdType for TagManager {
    const CLASS_ID: ClassId = ClassId::TagManager;
}

/// Unity numbers custom tags from here; lower ids are its builtin tags.
const FIRST_CUSTOM_TAG: u16 = 20000;

impl Names {
    pub fn read<R: EnvResolver, P: TypeTreeProvider>(env: &Environment<R, P>) -> Result<Self> {
        let tm = env
            .globalgamemanagers()
            .and_then(|ggm| ggm.find_object_of::<TagManager>())?
            .context("globalgamemanagers has no TagManager")?;
        Ok(Names {
            layers: tm.layers,
            tags: tm.tags,
        })
    }

    fn layer(&self, index: u32) -> String {
        match self.layers.get(index as usize) {
            Some(name) if !name.is_empty() => name.clone(),
            _ => index.to_string(),
        }
    }

    fn tag(&self, id: u16) -> Option<String> {
        let index = id.checked_sub(FIRST_CUSTOM_TAG)?;
        self.tags.get(index as usize).cloned()
    }
}

/// FSM identity of a `PlayMakerFSM` component, keyed by its path id.
pub struct FsmInfo {
    pub name: String,
    pub template: Option<String>,
}

#[derive(Deserialize)]
struct BehaviourHeader {
    m_Enabled: u8,
}

#[derive(Deserialize)]
struct BoxCollider2D {
    m_Enabled: u8,
    m_IsTrigger: bool,
    m_Offset: (f32, f32),
    m_Size: (f32, f32),
}
#[derive(Deserialize)]
struct CircleCollider2D {
    m_Enabled: u8,
    m_IsTrigger: bool,
    m_Offset: (f32, f32),
    m_Radius: f32,
}
#[derive(Deserialize)]
struct CapsuleCollider2D {
    m_Enabled: u8,
    m_IsTrigger: bool,
    m_Offset: (f32, f32),
    m_Size: (f32, f32),
    m_Direction: i32,
}
#[derive(Deserialize)]
struct PolygonCollider2D {
    m_Enabled: u8,
    m_IsTrigger: bool,
    m_Offset: (f32, f32),
    m_Points: Polygon2D,
}
#[derive(Deserialize)]
struct Polygon2D {
    m_Paths: Vec<Vec<(f32, f32)>>,
}
#[derive(Deserialize)]
struct EdgeCollider2D {
    m_Enabled: u8,
    m_IsTrigger: bool,
    m_Offset: (f32, f32),
    m_Points: Vec<(f32, f32)>,
}

/// Column-major affine 3D transform: `[m00, m10, m20, m01, m11, m21, m02, m12, m22, tx, ty, tz]`.
type Mat = [f32; 12];

const IDENTITY: Mat = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0];

/// `[a, b, c, d, tx, ty]`: maps a point `(x, y, 0)` to `(a·x + c·y + tx, b·x + d·y + ty)`.
type Affine2 = [f32; 6];

fn project(m: &Mat) -> Affine2 {
    [m[0], m[1], m[3], m[4], m[9], m[10]]
}

/// `T · R · S` of a local transform.
fn trs(t: &Transform) -> Mat {
    let (x, y, z, w) = t.m_LocalRotation;
    let (sx, sy, sz) = t.m_LocalScale;
    let (px, py, pz) = t.m_LocalPosition;
    [
        (1.0 - 2.0 * (y * y + z * z)) * sx,
        2.0 * (x * y + z * w) * sx,
        2.0 * (x * z - y * w) * sx,
        2.0 * (x * y - z * w) * sy,
        (1.0 - 2.0 * (x * x + z * z)) * sy,
        2.0 * (y * z + x * w) * sy,
        2.0 * (x * z + y * w) * sz,
        2.0 * (y * z - x * w) * sz,
        (1.0 - 2.0 * (x * x + y * y)) * sz,
        px,
        py,
        pz,
    ]
}

fn mul(a: &Mat, b: &Mat) -> Mat {
    let mut r = [0.0; 12];
    for c in 0..4 {
        for row in 0..3 {
            r[c * 3 + row] = a[row] * b[c * 3]
                + a[3 + row] * b[c * 3 + 1]
                + a[6 + row] * b[c * 3 + 2]
                + if c == 3 { a[9 + row] } else { 0.0 };
        }
    }
    r
}

fn inverse(m: &Mat) -> Mat {
    let a = |row: usize, col: usize| m[col * 3 + row];
    let det = a(0, 0) * (a(1, 1) * a(2, 2) - a(1, 2) * a(2, 1))
        - a(0, 1) * (a(1, 0) * a(2, 2) - a(1, 2) * a(2, 0))
        + a(0, 2) * (a(1, 0) * a(2, 1) - a(1, 1) * a(2, 0));
    // the other two indices of a 3×3 row or column
    let others = |i: usize| match i {
        0 => (1, 2),
        1 => (0, 2),
        _ => (0, 1),
    };
    let mut r = [0.0; 12];
    for col in 0..3 {
        for row in 0..3 {
            // cofactor of the transposed position
            let (r0, r1) = others(col);
            let (c0, c1) = others(row);
            let minor = a(r0, c0) * a(r1, c1) - a(r0, c1) * a(r1, c0);
            let sign = if (row + col).is_multiple_of(2) {
                1.0
            } else {
                -1.0
            };
            r[col * 3 + row] = sign * minor / det;
        }
    }
    for row in 0..3 {
        r[9 + row] = -(r[row] * m[9] + r[3 + row] * m[10] + r[6 + row] * m[11]);
    }
    r
}

/// `path` is `root` or lies below it.
fn is_under(path: &str, root: &str) -> bool {
    path.strip_prefix(root)
        .is_some_and(|rest| rest.is_empty() || rest.starts_with('/'))
}

/// A GameObject with its Transform, which every GameObject has exactly one of.
fn read_go<R: EnvResolver, P: TypeTreeProvider>(
    file: &SerializedFileHandle<'_, R, P>,
    go: TypedPPtr<GameObject>,
) -> Result<(GameObject, Transform)> {
    let go = file.deref(go)?.read()?;
    for pair in &go.m_Component {
        let obj: ObjectRefHandle<'_, (), R, P> = file.deref(pair.component.typed())?;
        if matches!(obj.class_id(), ClassId::Transform | ClassId::RectTransform) {
            let transform = obj.cast_owned::<Transform>().read()?;
            return Ok((go, transform));
        }
    }
    anyhow::bail!("GameObject '{}' has no Transform", go.m_Name)
}

/// World matrix of a Transform's parent, and whether all its ancestors are active.
fn parent_world<R: EnvResolver, P: TypeTreeProvider>(
    file: &SerializedFileHandle<'_, R, P>,
    transform: &Transform,
) -> Result<(Mat, bool)> {
    let mut world = IDENTITY;
    let mut active = true;
    let mut father = transform.m_Father;
    while let Some(f) = father.optional() {
        let t = file.deref(f)?.read()?;
        active &= file.deref(t.m_GameObject)?.read()?.m_IsActive;
        world = mul(&trs(&t), &world);
        father = t.m_Father;
    }
    Ok((world, active))
}

pub struct Walker<'n, 'f> {
    pub names: &'n Names,
    pub fsms: &'f HashMap<PathId, FsmInfo>,
}

impl Walker<'_, '_> {
    /// The hierarchy of an FSM owner, plus the collider subtrees of `refs` (GameObject paths the FSM
    /// points at) outside of it. `None` if neither has a collider.
    ///
    /// Everything is placed in the owner's frame: its own rotation and scale apply (a flipped enemy
    /// stays flipped), its position doesn't (its pivot is the origin).
    pub fn hierarchy<R: EnvResolver, P: TypeTreeProvider>(
        &self,
        file: &SerializedFileHandle<'_, R, P>,
        owner: TypedPPtr<GameObject>,
        owner_path: &str,
        refs: &[String],
        scene: &SceneLookup<'_, &P>,
    ) -> Result<Option<Root>> {
        let (_, owner_transform) = read_go(file, owner)?;
        let owner_local = trs(&owner_transform);
        let mut owner_frame = owner_local;
        owner_frame[9..12].fill(0.0);
        let (owner_parent, _) = parent_world(file, &owner_transform)?;
        // world space → the owner's frame
        let from_world = mul(&owner_frame, &inverse(&mul(&owner_parent, &owner_local)));

        let mut external = Vec::new();
        for path in refs {
            // a ref below another ref is already drawn as part of it
            let below_other = refs
                .iter()
                .any(|other| other != path && is_under(path, other));
            if is_under(path, owner_path) || below_other {
                continue;
            }
            // refs into other files don't resolve here
            let Some((_, transform)) = scene.lookup_path(&mut file.reader(), path)? else {
                continue;
            };
            let go = transform.m_GameObject;
            let (_, transform) = read_go(file, go)?;
            let (parent, parents_active) = parent_world(file, &transform)?;
            if let Some(node) = self.walk(file, go, &mul(&from_world, &parent), false)? {
                external.push(External {
                    path: path.clone(),
                    parents_active,
                    node,
                });
            }
        }

        // undoes the owner's position, leaving the owner's frame once its local transform applies
        let mut undo_position = IDENTITY;
        undo_position[9..12].copy_from_slice(&[
            -owner_local[9],
            -owner_local[10],
            -owner_local[11],
        ]);
        let node = self
            .walk(file, owner, &undo_position, true)?
            .expect("kept when empty");
        if node.colliders.is_empty() && node.children.is_empty() && external.is_empty() {
            return Ok(None);
        }
        Ok(Some(Root { node, external }))
    }

    /// The subtree rooted at `go`, whose parent space maps to the owner's frame through `parent`.
    /// Pruned to nodes on the way to a collider; `None` if it has none, unless `keep_empty`.
    fn walk<R: EnvResolver, P: TypeTreeProvider>(
        &self,
        file: &SerializedFileHandle<'_, R, P>,
        go: TypedPPtr<GameObject>,
        parent: &Mat,
        keep_empty: bool,
    ) -> Result<Option<Node>> {
        let (go, transform) = read_go(file, go)?;
        let matrix = mul(parent, &trs(&transform));

        let mut components = Vec::new();
        let mut colliders = Vec::new();
        for pair in &go.m_Component {
            let obj: ObjectRefHandle<'_, (), R, P> = file.deref(pair.component.typed())?;
            let collider = |shape, offset, trigger, enabled: u8| Collider {
                shape,
                offset,
                trigger,
                enabled: enabled != 0,
            };
            match obj.class_id() {
                ClassId::BoxCollider2D => {
                    let c: BoxCollider2D = obj.cast_owned().read()?;
                    let shape = Shape::Box { size: c.m_Size };
                    colliders.push(collider(shape, c.m_Offset, c.m_IsTrigger, c.m_Enabled));
                }
                ClassId::CircleCollider2D => {
                    let c: CircleCollider2D = obj.cast_owned().read()?;
                    let shape = Shape::Circle { radius: c.m_Radius };
                    colliders.push(collider(shape, c.m_Offset, c.m_IsTrigger, c.m_Enabled));
                }
                ClassId::CapsuleCollider2D => {
                    let c: CapsuleCollider2D = obj.cast_owned().read()?;
                    let shape = Shape::Capsule {
                        size: c.m_Size,
                        direction: c.m_Direction,
                    };
                    colliders.push(collider(shape, c.m_Offset, c.m_IsTrigger, c.m_Enabled));
                }
                ClassId::PolygonCollider2D => {
                    let c: PolygonCollider2D = obj.cast_owned().read()?;
                    let shape = Shape::Polygon {
                        paths: c.m_Points.m_Paths,
                    };
                    colliders.push(collider(shape, c.m_Offset, c.m_IsTrigger, c.m_Enabled));
                }
                ClassId::EdgeCollider2D => {
                    let c: EdgeCollider2D = obj.cast_owned().read()?;
                    let shape = Shape::Edge { points: c.m_Points };
                    colliders.push(collider(shape, c.m_Offset, c.m_IsTrigger, c.m_Enabled));
                }
                ClassId::MonoBehaviour => {
                    let Some(script) = obj.mono_script()? else {
                        continue;
                    };
                    let header: BehaviourHeader = obj
                        .object
                        .cast::<BehaviourHeader>()
                        .read(&mut obj.file.reader())?;
                    let fsm = self.fsms.get(&obj.path_id());
                    components.push(Component {
                        class: script.m_ClassName,
                        enabled: header.m_Enabled != 0,
                        fsm: fsm.map(|f| f.name.clone()),
                        template: fsm.and_then(|f| f.template.clone()),
                    });
                }
                _ => {}
            }
        }

        let mut children = Vec::new();
        for child in transform.m_Children {
            let child_go = file.deref(child)?.read()?.m_GameObject;
            if let Some(node) = self.walk(file, child_go, &matrix, false)? {
                children.push(node);
            }
        }

        if colliders.is_empty() && children.is_empty() && !keep_empty {
            return Ok(None);
        }
        Ok(Some(Node {
            name: go.m_Name,
            active: go.m_IsActive,
            layer: self.names.layer(go.m_Layer),
            tag: self.names.tag(go.m_Tag),
            matrix: project(&matrix),
            components,
            colliders,
            children,
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn transform(
        position: (f32, f32, f32),
        rotation: (f32, f32, f32, f32),
        scale: (f32, f32, f32),
    ) -> Transform {
        Transform {
            m_LocalPosition: position,
            m_LocalRotation: rotation,
            m_LocalScale: scale,
            ..Default::default()
        }
    }

    fn assert_close(actual: &[f32], expected: &[f32]) {
        for (a, b) in actual.iter().zip(expected) {
            assert!((a - b).abs() < 1e-5, "{actual:?} != {expected:?}");
        }
    }

    #[test]
    fn trs_rotates_then_scales_then_translates() {
        let half = std::f32::consts::FRAC_1_SQRT_2;
        // 90° around z maps local +x to +y
        let m = trs(&transform(
            (3.0, 4.0, 0.0),
            (0.0, 0.0, half, half),
            (2.0, 1.0, 1.0),
        ));
        assert_close(&project(&m), &[0.0, 2.0, -1.0, 0.0, 3.0, 4.0]);
        // 180° around y mirrors x, the way flipped objects are set up
        let m = trs(&transform(
            (0.0, 0.0, 0.0),
            (0.0, 1.0, 0.0, 0.0),
            (1.0, 1.0, 1.0),
        ));
        assert_close(&project(&m), &[-1.0, 0.0, 0.0, 1.0, 0.0, 0.0]);
    }

    #[test]
    fn inverse_undoes_rotation_scale_and_translation() {
        let t = transform(
            (3.0, -2.0, 0.5),
            (0.0, 0.0, 0.15f32.sin(), 0.15f32.cos()),
            (-1.5, 2.0, 1.0),
        );
        let m = trs(&t);
        assert_close(&mul(&inverse(&m), &m), &IDENTITY);
    }

    #[test]
    fn is_under_respects_path_segments() {
        assert!(is_under("A/B", "A/B"));
        assert!(is_under("A/B/C", "A/B"));
        assert!(!is_under("A/BC", "A/B"));
    }
}
