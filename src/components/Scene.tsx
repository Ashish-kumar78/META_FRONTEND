import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars, Sparkles, CameraControls } from '@react-three/drei';
import { Earth } from './Earth.tsx';
import { Satellites } from './Satellites.tsx';
import { CosmicEnvironment } from './CosmicEnvironment.tsx';
import * as THREE from 'three';

// Camera controller component
function CinematicCamera({ selectedSatellite, cameraControlsRef }: any) {
  const { camera } = useThree();

  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    // Smooth cinematic transition durations
    cameraControlsRef.current.smoothTime = 1.2;
    cameraControlsRef.current.draggingDampingFactor = 0.1;

    if (selectedSatellite && selectedSatellite.position) {
      const satPos = selectedSatellite.position;
      const offsetPos = new THREE.Vector3().copy(satPos).normalize().multiplyScalar(satPos.length() + 2.2);
      
      cameraControlsRef.current.setLookAt(
        offsetPos.x + 0.5, offsetPos.y + 0.3, offsetPos.z, 
        satPos.x, satPos.y, satPos.z,                      
        true                                               
      );
    } else {
      cameraControlsRef.current.setLookAt(
        0, 0, 7,  
        0, 0, 0,  
        true      
      );
    }
  }, [selectedSatellite, cameraControlsRef]);

  return null;
}

export function Scene({ selectedSatellite, setSelectedSatellite, onShowGlobal }: any) {
  const cameraControlsRef = useRef<any>(null);

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        {/* Soft immersive dark nebula background */}
        <color attach="background" args={['#01030a']} />
        <fog attach="fog" args={['#01030a', 20, 100]} />
        
        {/* Ambient and directional space lighting */}
        <ambientLight intensity={0.06} />
        <directionalLight position={[10, 5, 8]} intensity={3.5} color="#ffffff" castShadow />
        <directionalLight position={[-10, -5, -8]} intensity={0.4} color="#0a44ff" />

        <Suspense fallback={null}>
          <Stars radius={200} depth={80} count={10000} factor={6} saturation={0} fade speed={0.5} />
          {/* Deep space nebula particles */}
          <Sparkles count={800} scale={30} size={2.0} speed={0.1} opacity={0.4} color="#00aaff" />
          <Sparkles count={400} scale={25} size={3.0} speed={0.05} opacity={0.2} color="#cc00ff" />
          
          <CosmicEnvironment />
          <Earth onClick={onShowGlobal} />
          
          <Satellites 
            selectedSatellite={selectedSatellite} 
            onSatelliteClick={(sat: any) => setSelectedSatellite(sat)} 
          />
        </Suspense>

        <CameraControls 
          ref={cameraControlsRef}
          makeDefault
          minDistance={2.1} 
          maxDistance={30} 
        />
        
        <CinematicCamera 
          selectedSatellite={selectedSatellite} 
          cameraControlsRef={cameraControlsRef} 
        />
        
      </Canvas>
    </div>
  );
}
