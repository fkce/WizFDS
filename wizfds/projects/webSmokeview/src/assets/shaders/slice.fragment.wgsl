struct Varyings { @builtin(position) position: vec4f, @location(0) vtexture_coordinate: f32, @location(1) vblank: f32, };
struct UniformsF { is_blank: i32, };
@group(0) @binding(0) var texture_colorbar_sampler_tex: texture_2d<f32>;
@group(0) @binding(1) var texture_colorbar_sampler_sam: sampler;
@group(0) @binding(2) var<uniform> uniformsF: UniformsF;
@fragment fn main(input: Varyings) -> @location(0) vec4f { if (input.vblank == 0.0 && uniformsF.is_blank == 1) { discard; } let c = textureSample(texture_colorbar_sampler_tex, texture_colorbar_sampler_sam, vec2f(0.5, input.vtexture_coordinate / 255.0)); return c; }
