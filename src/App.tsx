import React, { useState } from 'react';
import { Interface } from './components/Interface.tsx';
import { Scene } from './components/Scene.tsx';
import { GlobalDashboard } from './components/GlobalDashboard.tsx';

function App() {
  const [selectedSatellite, setSelectedSatellite] = useState<any | null>(null);
  const [showGlobalDashboard, setShowGlobalDashboard] = useState(false);

  return (
    <div className="w-full h-screen bg-[#02040a] text-white overflow-hidden relative">
      <Scene 
        selectedSatellite={selectedSatellite} 
        setSelectedSatellite={setSelectedSatellite} 
        onShowGlobal={() => setShowGlobalDashboard(true)} 
      />
      <Interface 
        selectedSatellite={selectedSatellite} 
        setSelectedSatellite={setSelectedSatellite} 
        onShowGlobal={() => setShowGlobalDashboard(true)} 
      />
      {showGlobalDashboard && <GlobalDashboard onClose={() => setShowGlobalDashboard(false)} />}
    </div>
  );
}

export default App;
