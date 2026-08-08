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

    // A range with no width has no place to put a value, and a token epsilon is
    // not an answer: dividing the last bits of float noise by 1e-30 saturates
    // in both directions, so a field that is one temperature everywhere comes
    // out speckled blue and red. The middle of the palette is the honest
    // reading - every value here is the same value (ADR-0019).
    let span = uniforms.range_max - uniforms.range_min;
    let divisor = select(1.0, span, span > 0.0);
    let along = (vertexInputs.slice_value - uniforms.range_min) / divisor;
    vertexOutputs.vcolorbar = select(0.5, clamp(along, 0.0, 1.0), span > 0.0);
    vertexOutputs.vblank = vertexInputs.blank;
    return vertexOutputs;
}
