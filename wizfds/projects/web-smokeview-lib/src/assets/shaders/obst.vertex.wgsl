#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;
attribute color : vec4<f32>;

varying vPositionOS : vec3<f32>;
varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    let worldPosition = mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    vertexOutputs.position = scene.viewProjection * worldPosition;
    vertexOutputs.vPositionOS = vertexInputs.position;
    vertexOutputs.vColor = vertexInputs.color;
    // Transform normal to view space so lighting rotates with camera
    vertexOutputs.vNormal = normalize((scene.view * mesh.world * vec4<f32>(vertexInputs.normal, 0.0)).xyz);
    return vertexOutputs;
}
