uniform is_blank: i32;
var texture_colorbar_sampler_tex: texture_2d<f32>;
var texture_colorbar_sampler_texSampler: sampler;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    if (uniforms.is_blank == 1) {
        discard;
    }
    // Use simple UV mapping
    let uv = vec2<f32>(0.5, 0.5);
    return FragmentOutputs(textureSample(texture_colorbar_sampler_tex, texture_colorbar_sampler_texSampler, uv));
}
