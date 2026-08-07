#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute slice_value : f32;
attribute blank : f32;

// The quantity group's range (ADR-0017): raw values map to the colorbar here,
// so a range change is a uniform update, never a data rewrite.
uniform range_min: f32;
uniform range_max: f32;

varying vcolorbar : f32;
varying vblank : f32;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    let span = max(uniforms.range_max - uniforms.range_min, 1e-30);
    vertexOutputs.vcolorbar = clamp((vertexInputs.slice_value - uniforms.range_min) / span, 0.0, 1.0);
    vertexOutputs.vblank = vertexInputs.blank;
    return vertexOutputs;
}
