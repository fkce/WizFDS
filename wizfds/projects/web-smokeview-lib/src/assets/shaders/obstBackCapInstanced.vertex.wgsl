#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;

// Added by Babylon as soon as the mesh has thin instances - see
// obstInstanced.vertex.wgsl. The cap needs no colour: it is always red.
attribute world0 : vec4<f32>;
attribute world1 : vec4<f32>;
attribute world2 : vec4<f32>;
attribute world3 : vec4<f32>;

varying vPositionW : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    let instanceWorld = mat4x4<f32>(
        vertexInputs.world0, vertexInputs.world1, vertexInputs.world2, vertexInputs.world3);
    let worldPosition = instanceWorld * vec4<f32>(vertexInputs.position, 1.0);

    vertexOutputs.position = scene.viewProjection * worldPosition;
    // In metres, as the clipping planes are (ADR-0002)
    vertexOutputs.vPositionW = worldPosition.xyz;
    return vertexOutputs;
}
