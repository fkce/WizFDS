precision mediump float;

uniform sampler2D texture_colorbar_sampler; 
uniform int is_blank;

varying float vtexture_coordinate;
varying float vblank;

void main(void) {
    
    if(vblank == 0.0 && is_blank == 1) discard;

    gl_FragColor = texture2D(texture_colorbar_sampler, vec2(0.5,vtexture_coordinate/255.0));
}