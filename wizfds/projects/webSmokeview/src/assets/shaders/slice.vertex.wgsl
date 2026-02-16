struct VertexInputs { @location(0) position: vec3f, @location(1) texture_coordinate: f32, @location(2) blank: f32, };
struct Varyings { @builtin(position) position: vec4f, @location(0) vtexture_coordinate: f32, @location(1) vblank: f32, };
struct Uniforms { worldViewProjection: mat4x4f, }; @group(0) @binding(0) var<uniform> uniforms: Uniforms; @vertex fn main(input: VertexInputs) -> Varyings { var out: Varyings; out.position = uniforms.worldViewProjection * vec4f(input.position, 1.0); out.vtexture_coordinate = input.texture_coordinate; out.vblank = input.blank; return out; }
