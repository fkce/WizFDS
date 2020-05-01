precision highp float;

varying vec3 vcolor;
varying vec3 normalInterp;
varying vec3 vertPos;

uniform float transparent;

vec3 ambientColor=vec3(1.0, 1.0, 1.0);
vec3 diffuseColor=vec3(0.6, 0.6, 0.6);
vec3 specularColor=vec3(1.0, 1.0, 1.0);
vec3 lightPos=vec3(1.0,1.0,-1.0);
float Ka=0.1;
float Kd=0.2;
float Ks=0.1;
float shininessVal=10.0;
void main() {
    vec3 N = normalize(normalInterp);
    vec3 L = normalize(lightPos - vertPos);
    float lambertian = max(dot(N, L), 0.0);
    float specular = 0.0;
    if(lambertian > 0.0) {
        vec3 R = reflect(-L, N);
        vec3 V = normalize(-vertPos);
        float specAngle = max(dot(R, V), 0.0);
        specular = pow(specAngle, shininessVal);
    }

    gl_FragColor = vec4((1.0-Ka-Kd)*vcolor + Ka * ambientColor + Kd * lambertian * diffuseColor + Ks * specular * specularColor, transparent);
}