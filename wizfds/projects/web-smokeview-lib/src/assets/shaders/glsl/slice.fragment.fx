precision highp float;
varying float vtexture_coordinate;
varying float vblank;

uniform int is_blank;
uniform sampler2D texture_colorbar_sampler;

void main(){
    if (vblank == 0.0 && is_blank == 1) discard;
    vec4 c = texture2D(texture_colorbar_sampler, vec2(0.5, vtexture_coordinate / 255.0));
    gl_FragColor = c;
}
