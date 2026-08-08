varying vcolorbar : f32;
varying vPositionOS : vec3<f32>;

uniform clipX: f32;
uniform clipY: f32;
uniform clipZ: f32;

var texture_colorbar_sampler_tex: texture_2d<f32>;
var texture_colorbar_sampler_texSampler: sampler;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    // The same test the obst, vent and fire shaders make, in the same
    // coordinates: a plane dragged through the model has to cut the values
    // painted on a surface along with the surface itself.
    let p = input.vPositionOS;
    if (p.x <= uniforms.clipX || p.y <= uniforms.clipY || p.z >= uniforms.clipZ) {
        discard;
    }

    // No blank test, unlike the slice shader: a patch cell with nothing behind
    // it holds the ambient value FDS wrote into a hole, which is worth nothing
    // to look at, so those cells never reach the index buffer (see
    // boundary-build.ts) and there is no toggle to bring them back.

    // The colorbar is a 1-wide, 256-tall strip: v walks the colours.
    let uv = vec2<f32>(0.5, fragmentInputs.vcolorbar);
    return FragmentOutputs(textureSample(texture_colorbar_sampler_tex, texture_colorbar_sampler_texSampler, uv));
}
