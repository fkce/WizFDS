varying vPositionW : vec3<f32>;

uniform clipX: f32;
uniform clipY: f32;
uniform clipZ: f32;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let p = input.vPositionW;
    if (p.x <= uniforms.clipX || p.y <= uniforms.clipY || p.z >= uniforms.clipZ) {
        discard;
    }
    return FragmentOutputs(vec4<f32>(1.0, 0.0, 0.0, 1.0));
}
