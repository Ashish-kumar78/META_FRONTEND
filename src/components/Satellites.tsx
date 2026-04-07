import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { QuadraticBezierLine } from '@react-three/drei';
import * as THREE from 'three';


function SatelliteModel({ color, isSelected }: { color: string, isSelected: boolean }) {
  const modelRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (modelRef.current) {
        modelRef.current.rotation.y = clock.getElapsedTime() * 0.2;
        modelRef.current.rotation.x = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <group ref={modelRef} scale={isSelected ? 1.5 : 1.2}>
      {/* Central Hexagonal-like Body (Gold Foil Thermal Blanket) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.16, 6]} />
        <meshStandardMaterial color="#cca42b" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.04, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Primary Solar Array Struts */}
      <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.003, 0.003, 0.14]} />
        <meshStandardMaterial color="#999999" metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.003, 0.003, 0.14]} />
        <meshStandardMaterial color="#999999" metalness={1} roughness={0.2} />
      </mesh>
      
      {/* Massive Cross-shaped Solar Panels */}
      {/* Left Panels */}
      <mesh position={[-0.15, 0.045, 0]} castShadow rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.12, 0.002, 0.08]} />
        <meshStandardMaterial color="#051024" metalness={0.6} roughness={0.4} emissive="#020a1a" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.15, -0.045, 0]} castShadow rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.12, 0.002, 0.08]} />
        <meshStandardMaterial color="#051024" metalness={0.6} roughness={0.4} emissive="#020a1a" emissiveIntensity={0.5} />
      </mesh>

      {/* Right Panels */}
      <mesh position={[0.15, 0.045, 0]} castShadow rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.12, 0.002, 0.08]} />
        <meshStandardMaterial color="#051024" metalness={0.6} roughness={0.4} emissive="#020a1a" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.15, -0.045, 0]} castShadow rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.12, 0.002, 0.08]} />
        <meshStandardMaterial color="#051024" metalness={0.6} roughness={0.4} emissive="#020a1a" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Extended Relay Dish Antenna */}
      <mesh position={[0, 0.14, 0.04]} rotation={[Math.PI/6, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1]} />
        <meshStandardMaterial color="#ffffff" metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.18, 0.06]} rotation={[Math.PI/4, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.001, 0.02, 16]} />
        <meshStandardMaterial color="#eeeeee" metalness={1} roughness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Glowing network beacon */}
      <mesh position={[0, 0.18, 0.06]}>
        <sphereGeometry args={[0.015]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Target marker Ambient Glow Ring */}
      <mesh>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={isSelected ? 0.25 : 0.0} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function Satellites({ selectedSatellite, setSelectedSatellite, onSatelliteClick }: any) {
  const groupRef = useRef<THREE.Group>(null);
  
  const [satelliteData, setSatelliteData] = React.useState<any[]>([]);
  const positionsRef = useRef<THREE.Vector3[]>([]);

  // Fetch real-world data payload from API equivalent
  React.useEffect(() => {
    fetch('/satellites.json')
      .then(res => res.json())
      .then(data => {
        setSatelliteData(data);
        positionsRef.current = data.map(() => new THREE.Vector3());
      })
      .catch(console.error);
  }, []);

  // Compute organic mesh networking
  const connections = useMemo(() => {
    const lines: [number, number][] = [];
    // Connect regional satellites together creating authentic telecommunications networks
    for (let i = 0; i < satelliteData.length; i++) {
        for (let j = i + 1; j < satelliteData.length && j < i + 4; j++) {
            const isSameAgency = satelliteData[i].agency.includes('ISRO') && satelliteData[j].agency.includes('ISRO') 
                              || satelliteData[i].agency.includes('NASA') && satelliteData[j].agency.includes('NASA');
            if (isSameAgency) {
                lines.push([i, j]);
                break; // Only link nearest neighbor to prevent visual clutter
            }
        }
    }
    return lines;
  }, [satelliteData]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current && satelliteData.length > 0) {
      groupRef.current.children.forEach((child, i) => {
        if (i >= satelliteData.length || !positionsRef.current[i]) return; 
        
        const data = satelliteData[i];
        const angle = t * data.orbitSpeed * 0.1 + data.angleOffset;
        
        const x = Math.cos(angle) * data.orbitRadius;
        const z = Math.sin(angle) * data.orbitRadius;
        const y = Math.sin(angle + Math.PI/2) * data.orbitRadius * data.inclination;
        
        child.position.set(x, y, z);
        positionsRef.current[i].copy(child.position);
        
        // Face earth
        child.lookAt(0, 0, 0);
      });
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {satelliteData.map((sat: any, i: number) => {
          const isSelected = selectedSatellite?.id === sat.id;
          return (
            <group 
              key={sat.id}
              onClick={(e) => {
                e.stopPropagation();
                // We use the positionsRef to get the exact world position for the camera to track
                onSatelliteClick({ ...sat, position: positionsRef.current[i].clone() });
              }}
              onPointerOver={(e) => {
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={(e) => {
                document.body.style.cursor = 'auto';
              }}
            >
              <SatelliteModel color={sat.color} isSelected={isSelected} />
              
              {/* Draw faint orbit ring */}
              <mesh rotation={[-Math.PI / 2 + sat.inclination, 0, 0]}>
                <ringGeometry args={[sat.orbitRadius - 0.002, sat.orbitRadius + 0.002, 128]} />
                <meshBasicMaterial color={sat.color} transparent opacity={0.08} side={THREE.DoubleSide} />
              </mesh>
            </group>
          );
        })}
      </group>
      
      {/* Network Links (Real Agency Comms Arcs) */}
      {connections.map(([fromIdx, toIdx], idx) => {
         if (!positionsRef.current[fromIdx] || !positionsRef.current[toIdx]) return null;
         return (
           <NetworkLine 
             key={idx} 
             fromRef={positionsRef.current[fromIdx]} 
             toRef={positionsRef.current[toIdx]} 
           />
         )
      })}
    </>
  );
}

function NetworkLine({ fromRef, toRef }: { fromRef: THREE.Vector3, toRef: THREE.Vector3 }) {
  const lineRef = useRef<any>(null);
  
  useFrame(() => {
    if (lineRef.current) {
      // Create an arc curve between the two satellites by raising the midpoint
      const midPoint = fromRef.clone().lerp(toRef, 0.5);
      const distance = fromRef.distanceTo(toRef);
      midPoint.normalize().multiplyScalar(midPoint.length() + distance * 0.2); // curve outwards
      
      lineRef.current.setPoints(fromRef, toRef, midPoint);
    }
  });

  return (
    <QuadraticBezierLine 
      ref={lineRef}
      start={[0,0,0]} 
      end={[0,0,0]} 
      mid={[0,0,0]} 
      color="#ffaa00" 
      lineWidth={1.5}
      transparent
      opacity={0.3}
      dashed={true}
      dashScale={50}
      dashSize={2}
      dashOffset={0}
      blending={THREE.AdditiveBlending}
    />
  );
}


