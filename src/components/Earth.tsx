import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';
import * as THREE from 'three';

const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vSunDir;
  uniform vec3 sunDirection;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vSunDir = normalize(sunDirection);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const earthFragmentShader = `
  uniform sampler2D tColor;
  uniform sampler2D tNight;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vSunDir;

  void main() {
    float dayNight = dot(vNormal, vSunDir);
    float smoothDay = smoothstep(-0.25, 0.25, dayNight);

    vec4 dayColor = texture2D(tColor, vUv);
    vec4 nightColor = texture2D(tNight, vUv);

    // Boost city lights slightly for hackathon pop
    vec3 finalColor = mix(nightColor.rgb * 2.0, dayColor.rgb, smoothDay);
    
    // Atmospheric Rim (Fresnel)
    float fresnel = dot(normalize(cameraPosition - vNormal), vNormal);
    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
    fresnel = pow(fresnel, 3.5);
    vec3 atmosphereColor = vec3(0.0, 0.6, 1.0);
    
    finalColor += atmosphereColor * fresnel * smoothDay * 0.8;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function CloudLayer({ cloudsMap }: { cloudsMap: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
        // Clouds move slightly faster than the earth itself
        meshRef.current.rotation.y = clock.getElapsedTime() * 0.06;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.015, 64, 64]} />
      <meshLambertMaterial 
        map={cloudsMap}
        transparent={true}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function Earth(props: any) {
  const earthRef = useRef<THREE.Mesh>(null);

  const [colorMap, cloudsMap, nightMap] = useLoader(TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png',
  ]);

  const uniforms = useMemo(() => ({
    tColor: { value: colorMap },
    tNight: { value: nightMap },
    sunDirection: { value: new THREE.Vector3(5, 3, 5).normalize() }
  }), [colorMap, nightMap]);

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    if (earthRef.current) {
      earthRef.current.rotation.y = elapsedTime * 0.05;
    }
  });

  return (
    <group>
      {/* Main Earth Shader */}
      <mesh ref={earthRef} onClick={(e) => {
        e.stopPropagation();
        if (typeof (props as any).onClick === 'function') {
           (props as any).onClick();
        }
      }}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <sphereGeometry args={[2, 64, 64]} />
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      
      {/* Cloud Layer (Depth separation) */}
      <CloudLayer cloudsMap={cloudsMap} />
      
      {/* Outer Atmosphere Glow */}
      <mesh>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial
          color="#0066ff"
          transparent={true}
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
