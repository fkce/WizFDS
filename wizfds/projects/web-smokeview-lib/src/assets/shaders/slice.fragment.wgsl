varying vcolorbar : f32;
varying vblank : f32;

// 1 culls the cells buried in obsts, 0 shows the data underneath - the
// "Blank" toggle of CONTEXT.md. The GLSL this reproduces was removed in #82.
uniform is_blank: i32;
var texture_colorbar_sampler_tex: texture_2d<f32>;
var texture_colorbar_sampler_texSampler: sampler;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    // vblank interpolates: it reaches 0.0 only where every vertex of the
    // cell is buried, so exactly the covered cells disappear.
    if (fragmentInputs.vblank == 0.0 && uniforms.is_blank == 1) {
        discard;
    }
    // The colorbar is a 1-wide, 256-tall strip: v walks the colours.
    let uv = vec2<f32>(0.5, fragmentInputs.vcolorbar);
    return FragmentOutputs(textureSample(texture_colorbar_sampler_tex, texture_colorbar_sampler_texSampler, uv));
}
