#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position: vec3f;
attribute normal: vec3f;

varying vNormal: vec3f;

@vertex
fn main(input: VertexInputs) -> FragmentInputs {
    var worldPos: vec4f = uniforms.world * vec4f(input.position, 1.0);
    vertexOutputs.position = uniforms.viewProjection * worldPos;
    
    // Transform normal to view space for lighting
    var worldNormal: vec3f = normalize((uniforms.world * vec4f(input.normal, 0.0)).xyz);
    vertexOutputs.vNormal = normalize((uniforms.view * vec4f(worldNormal, 0.0)).xyz);
}
