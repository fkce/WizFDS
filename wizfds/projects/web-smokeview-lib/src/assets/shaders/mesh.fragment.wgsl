varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;

uniform transparent: f32;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let lightDirection = vec3<f32>(0.0, 0.0, -1.0);
    let normal = normalize(input.vNormal);
    let diffuse = max(dot(normal, lightDirection), 0.0);
    let ambient = 0.5;
    let lightIntensity = ambient + diffuse * 0.5;
    let finalColor = input.vColor.rgb * lightIntensity;
    return FragmentOutputs(vec4<f32>(finalColor, uniforms.transparent));
}
