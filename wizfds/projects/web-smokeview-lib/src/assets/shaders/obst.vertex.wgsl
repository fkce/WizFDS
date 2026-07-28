#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;
attribute color : vec4<f32>;

varying vPositionW : vec3<f32>;
varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    let worldPosition = mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    vertexOutputs.position = scene.viewProjection * worldPosition;
    // The clipping planes are FDS coordinates in metres (ADR-0002), so the
    // fragment stage has to be handed a world position - obstInstanced.vertex
    // works out the same one from its per-instance matrix.
    vertexOutputs.vPositionW = worldPosition.xyz;
    vertexOutputs.vColor = vertexInputs.color;
    // Transform normal to view space so lighting rotates with camera
    vertexOutputs.vNormal = normalize((scene.view * mesh.world * vec4<f32>(vertexInputs.normal, 0.0)).xyz);
    return vertexOutputs;
}
