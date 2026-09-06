import { program } from './glutil.js';

// GPU-driven ember field: N points drift upward and sideways forever, position
// computed purely from a per-point seed + uTime so there is no per-frame CPU cost.
const VS = `#version 300 es
in float aSeed;
uniform float uTime;
uniform float uCount;
uniform vec2 uArea;      // half-extents in clip space
uniform vec2 uCenter;
uniform float uSpeed;
uniform float uSize;
out float vLife;
out float vSeed;

float hash(float n){ return fract(sin(n) * 43758.5453123); }

void main(){
  float id = aSeed;
  float rx = hash(id * 12.9898);
  float ry = hash(id * 78.233 + 1.0);
  float rspeed = 0.6 + hash(id * 4.51) * 0.9;
  float period = 6.0 + hash(id * 7.77) * 7.0;
  float t = mod(uTime * uSpeed * rspeed + id * 97.0, period) / period; // 0..1 loop
  vLife = 1.0 - t;
  float drift = sin((uTime * 0.3 + id) * 1.7) * 0.12;
  vec2 p;
  p.x = uCenter.x + (rx * 2.0 - 1.0) * uArea.x + drift * uArea.x;
  p.y = uCenter.y - uArea.y + t * uArea.y * 2.2;
  vSeed = ry;
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = uSize * (0.5 + ry) * (0.4 + vLife * 0.8);
}`;

const FS = `#version 300 es
precision highp float;
in float vLife;
in float vSeed;
uniform vec3 uColorHot;
uniform vec3 uColorCool;
uniform float uOpacity;
out vec4 frag;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = length(uv);
  float a = smoothstep(1.0, 0.0, d);
  a *= a;
  vec3 col = mix(uColorCool, uColorHot, vSeed);
  float fade = smoothstep(0.0, 0.15, vLife) * smoothstep(1.0, 0.7, vLife) + smoothstep(1.0,0.7,vLife)*0.0;
  fade = clamp(vLife * 1.4, 0.0, 1.0) * smoothstep(1.0, 0.0, vLife*vLife);
  frag = vec4(col * a * fade * uOpacity, a * fade * uOpacity);
}`;

export function createEmbers(gl, count = 140) {
  const prog = program(gl, VS, FS);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = i + Math.random() * 0.5;
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

  const loc = {
    aSeed: gl.getAttribLocation(prog, 'aSeed'),
    uTime: gl.getUniformLocation(prog, 'uTime'),
    uArea: gl.getUniformLocation(prog, 'uArea'),
    uCenter: gl.getUniformLocation(prog, 'uCenter'),
    uSpeed: gl.getUniformLocation(prog, 'uSpeed'),
    uSize: gl.getUniformLocation(prog, 'uSize'),
    uColorHot: gl.getUniformLocation(prog, 'uColorHot'),
    uColorCool: gl.getUniformLocation(prog, 'uColorCool'),
    uOpacity: gl.getUniformLocation(prog, 'uOpacity'),
  };

  return {
    draw(time, { area = [1, 1], center = [0, 0], speed = 1, size = 40 * (window.devicePixelRatio || 1),
      hot = [1, 0.55, 0.25], cool = [0.75, 0.1, 0.12], opacity = 0.9 } = {}) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc.aSeed);
      gl.vertexAttribPointer(loc.aSeed, 1, gl.FLOAT, false, 0, 0);
      gl.uniform1f(loc.uTime, time);
      gl.uniform2f(loc.uArea, area[0], area[1]);
      gl.uniform2f(loc.uCenter, center[0], center[1]);
      gl.uniform1f(loc.uSpeed, speed);
      gl.uniform1f(loc.uSize, size);
      gl.uniform3f(loc.uColorHot, hot[0], hot[1], hot[2]);
      gl.uniform3f(loc.uColorCool, cool[0], cool[1], cool[2]);
      gl.uniform1f(loc.uOpacity, opacity);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    },
  };
}
