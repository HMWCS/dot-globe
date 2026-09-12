export const opaquePointRatio = 0.72;

export const vertexShader = /* glsl */ `
  attribute float aLand;
  attribute float aVisible;

  uniform float uPixelRatio;
  uniform float uPointSize;

  varying float vFacing;
  varying float vLand;
  varying float vVisible;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 viewNormal = normalize(normalMatrix * normalize(position));

    vFacing = viewNormal.z;
    vLand = aLand;
    vVisible = aVisible;

    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = uPointSize * uPixelRatio;
  }
`;

export const fragmentShader = /* glsl */ `
  uniform float uBacksideOpacity;
  uniform vec3 uColor;
  uniform float uLandOpacity;
  uniform float uOceanOpacity;

  varying float vFacing;
  varying float vLand;
  varying float vVisible;

  void main() {
    if (vVisible < 0.5) discard;
    float distanceFromCenter = length(gl_PointCoord - vec2(0.5)) * 2.0;
    float circle = 1.0 - smoothstep(${opaquePointRatio}, 1.0, distanceFromCenter);
    float facingOpacity = mix(uBacksideOpacity, 1.0, smoothstep(-0.45, 0.35, vFacing));
    float surfaceOpacity = mix(uOceanOpacity, uLandOpacity, vLand);
    float alpha = circle * facingOpacity * surfaceOpacity;
    float edgeHighlight = 1.0 - smoothstep(0.0, 0.5, abs(vFacing));
    vec3 pointColor = mix(uColor, vec3(1.0), edgeHighlight * 0.1);

    if (alpha < 0.003) discard;
    gl_FragColor = vec4(pointColor, alpha);
  }
`;
