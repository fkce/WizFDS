#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;

// Added by Babylon as soon as the mesh has thin instances: world0..world3 are
// the per-instance matrix, instanceColor the per-instance colour. The pool sets
// the latter through thinInstanceSetBuffer('color', ...), which Babylon renames.
attribute world0 : vec4<f32>;
attribute world1 : vec4<f32>;
attribute world2 : vec4<f32>;
attribute world3 : vec4<f32>;
attribute instanceColor : vec4<f32>;

varying vPositionW : vec3<f32>;
varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    // mesh.world is deliberately left out: the base box never moves, and the
    // instance matrix already carries the box from the unit cube to where the
    // scenario puts it, in metres.
    let instanceWorld = mat4x4<f32>(
        vertexInputs.world0, vertexInputs.world1, vertexInputs.world2, vertexInputs.world3);
    let worldPosition = instanceWorld * vec4<f32>(vertexInputs.position, 1.0);

    vertexOutputs.position = scene.viewProjection * worldPosition;
    vertexOutputs.vPositionW = worldPosition.xyz;
    vertexOutputs.vColor = vertexInputs.instanceColor;

    // Through the view alone, not through the instance matrix. Every box is
    // axis-aligned and only scaled, so a face normal is the same vector in
    // object and in world space - and an &OBST written as a sheet is scaled by
    // almost nothing on one axis, which would collapse its normal to zero.
    vertexOutputs.vNormal = normalize((scene.view * vec4<f32>(vertexInputs.normal, 0.0)).xyz);
    return vertexOutputs;
}
