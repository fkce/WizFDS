#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;
attribute color : vec4<f32>;

varying vPositionW : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    let worldPosition = mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    vertexOutputs.position = scene.viewProjection * worldPosition;
    // In metres, as the clipping planes are (ADR-0002)
    vertexOutputs.vPositionW = worldPosition.xyz;
    return vertexOutputs;
}
