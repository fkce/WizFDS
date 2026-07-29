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

    // The clipping planes are FDS coordinates, and a batched plane is baked at
    // its own (ADR-0002), so the position the fragment stage tests is this one
    vertexOutputs.vPositionOS = vertexInputs.position;

    // Pass color with alpha channel for transparency
    vertexOutputs.vColor = vertexInputs.color;
    
    // Transform normal to view space for lighting
    vertexOutputs.vNormal = normalize((scene.view * mesh.world * vec4<f32>(vertexInputs.normal, 0.0)).xyz);
    return vertexOutputs;
}
