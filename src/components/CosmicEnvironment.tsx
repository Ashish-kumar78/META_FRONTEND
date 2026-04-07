import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';
import * as THREE from 'three';

function AsteroidBelt() {
  const count = 1200;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < count; i++) {
        // Distribute asteroids in a belt between radius 7 and 18
        const radius = 7 + (Math.random() * Math.random()) * 11;
        const angle = Math.random() * Math.PI * 2;
        // Torus-like spread on the Y axis
        const y = (Math.random() - 0.5) * (Math.random() * 3); 

        dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        
        // Random rocky rotations
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        
        // Vastly different chunk sizes for cinematic variation
        const scale = 0.5 + Math.pow(Math.random(), 3) * 3;
        dummy.scale.set(scale, scale, scale);
        
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count, dummy]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
        // Slow majestic drift of the entire belt
        meshRef.current.rotation.y = clock.getElapsedTime() * 0.015;
        // Extremely subtle tilt wobble
        meshRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.005) * 0.05;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]} castShadow receiveShadow>
      {/* Dodecahedron creates very convincing low-poly rocky chunks for asteroids */}
      <dodecahedronGeometry args={[0.04, 1]} /> 
      <meshStandardMaterial color="#666666" roughness={0.9} metalness={0.1} />
    </instancedMesh>
  );
}

function useGasGiantTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < 512; y++) {
      const v = y / 512;
      const noise = Math.sin(v * 70) * Math.sin(v * 140) * 0.15;
      // richer Jupiter band colors
      const r = 210 + Math.sin(v * 30 + noise) * 45;
      const g = 140 + Math.cos(v * 40 - noise) * 55;
      const b = 80 + Math.sin(v * 20) * 35;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, 1024, 1);
    }
    // Great red spot (more vibrant)
    ctx.fillStyle = 'rgba(200, 60, 30, 0.85)';
    ctx.beginPath();
    ctx.ellipse(350, 340, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sharper texturing noise
    const imgData = ctx.getImageData(0,0,1024,512);
    for(let i=0; i<imgData.data.length; i+=4) {
      const amt = (Math.random() - 0.5) * 20;
      imgData.data[i] += amt; imgData.data[i+1] += amt; imgData.data[i+2] += amt;
    }
    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function useMarsTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    // More vibrant space-realistic Mars base
    ctx.fillStyle = '#cc5522'; ctx.fillRect(0,0,1024,512);
    for(let i=0; i<6000; i++) {
        // High contrast craters
        ctx.fillStyle = `rgba(${Math.random()>0.5?80:200}, ${Math.random()>0.5?20:80}, 10, ${Math.random()*0.2})`;
        ctx.beginPath();
        const rw = 2 + Math.random()*15, rh = rw * (0.8 + Math.random()*0.4);
        ctx.ellipse(Math.random()*1024, Math.random()*512, rw, rh, Math.random()*Math.PI, 0, Math.PI*2);
        ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function useNeptuneTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0,0,0,512);
    // Deep realistic cinematic azure gradient
    grad.addColorStop(0, '#0a1d4a');
    grad.addColorStop(0.5, '#1b5cc2');
    grad.addColorStop(1, '#0a1d4a');
    ctx.fillStyle = grad; ctx.fillRect(0,0,1024,512);
    // subtle ice clouds
    for(let y=0; y<512; y+=3) {
      ctx.fillStyle = `rgba(230,240,255,${Math.sin(y*0.08)*0.06})`;
      ctx.fillRect(0,y,1024,3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function GasGiant() {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const jupiterTexture = useGasGiantTexture();
  
  useFrame(({ clock }) => {
     if(meshRef.current) meshRef.current.rotation.y = clock.getElapsedTime() * 0.05;
     if(ringRef.current) ringRef.current.rotation.z = clock.getElapsedTime() * 0.01;
  });

  return (
    <group position={[-70, 25, -100]}>
       <mesh ref={meshRef} castShadow receiveShadow>
         <sphereGeometry args={[20, 64, 64]} />
         <meshStandardMaterial 
            map={jupiterTexture} 
            roughness={0.5} 
            metalness={0.1} 
            emissive="#b37b42"
            emissiveIntensity={0.08}
         />
       </mesh>
       <mesh>
         <sphereGeometry args={[20.4, 64, 64]} />
         <meshBasicMaterial color="#d48b42" transparent opacity={0.15} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
       </mesh>
       <mesh>
         <sphereGeometry args={[21.0, 64, 64]} />
         <meshBasicMaterial color="#f0b67e" transparent opacity={0.06} blending={THREE.AdditiveBlending} />
       </mesh>

       <mesh ref={ringRef} rotation={[Math.PI/2.2, Math.PI/10, 0]} receiveShadow>
         <ringGeometry args={[25, 45, 128]} />
         <meshStandardMaterial color="#faedcd" transparent opacity={0.4} side={THREE.DoubleSide} roughness={0.7} />
       </mesh>
    </group>
  )
}

function ProceduralPlanet({ useTextureHook, position, radius, glowColor, glowSize = 1.03 }: any) {
  const texture = useTextureHook();
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
     if(meshRef.current) meshRef.current.rotation.y = clock.getElapsedTime() * 0.02;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial 
          map={texture} 
          roughness={0.75} 
          metalness={0.1}
          emissive={glowColor}
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * glowSize, 64, 64]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.18} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function DistantPlanets() {
  const rotationRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (rotationRef.current) {
      // Powerful, slow galactic parallax movement
      rotationRef.current.rotation.y = clock.getElapsedTime() * 0.001;
      rotationRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.05) * 1.5;
    }
  });

  return (
    <group ref={rotationRef}>
      <GasGiant />
      
      {/* Mars Real Texture */}
      <ProceduralPlanet 
        useTextureHook={useMarsTexture} 
        position={[80, -25, -60]} 
        radius={8}
        glowColor="#ff3300"
      />

      {/* Deep Blue Neptune/Uranus Texture */}
      <ProceduralPlanet 
        useTextureHook={useNeptuneTexture} 
        position={[25, 18, -45]} 
        radius={4}
        glowColor="#0044ff"
        glowSize={1.05}
      />
    </group>
  );
}

export function CosmicEnvironment() {
  return (
    <group>
      <AsteroidBelt />
      <DistantPlanets />
    </group>
  );
}
