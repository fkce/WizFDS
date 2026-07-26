#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;
attribute color : vec4<f32>;
attribute texture_coordinate : f32;
attribute blank : f32;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    return vertexOutputs;
}
