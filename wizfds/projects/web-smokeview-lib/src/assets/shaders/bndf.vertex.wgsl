#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute boundary_value : f32;

// The quantity's range (ADR-0017): raw values map to the palette here, so a
// range change is a uniform update and never a rewrite of the data.
uniform range_min: f32;
uniform range_max: f32;

varying vcolorbar : f32;
varying vPositionOS : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>(vertexInputs.position, 1.0);

    // The clipping planes are FDS coordinates and a patch is baked at its own
    // (ADR-0002), so the position the fragment stage tests is this one.
    vertexOutputs.vPositionOS = vertexInputs.position;

    // A range with no width has no place to put a value, and a token epsilon is
    // not an answer: dividing the last bits of float noise by 1e-30 saturates in
    // both directions, so a surface that is one temperature everywhere comes out
    // speckled blue and red. The middle of the palette is the honest reading -
    // every value here is the same value (ADR-0019).
    let span = uniforms.range_max - uniforms.range_min;
    let divisor = select(1.0, span, span > 0.0);
    let along = (vertexInputs.boundary_value - uniforms.range_min) / divisor;
    vertexOutputs.vcolorbar = select(0.5, clamp(along, 0.0, 1.0), span > 0.0);
    return vertexOutputs;
}
