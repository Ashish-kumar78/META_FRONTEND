import React, { useState } from 'react';
import { Interface } from './components/Interface.tsx';
import { Scene } from './components/Scene.tsx';
import { GlobalDashboard } from './components/GlobalDashboard.tsx';
import { MissionsPanel } from './components/MissionsPanel.tsx';
import { DatabasePanel } from './components/DatabasePanel.tsx';

function App() {
  const [selectedSatellite, setSelectedSatellite] = useState<any | null>(null);
  const [showGlobalDashboard, setShowGlobalDashboard] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showDatabase, setShowDatabase] = useState(false);

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
        onShowMissions={() => setShowMissions(true)}
        onShowDatabase={() => setShowDatabase(true)}
      />
      {showGlobalDashboard && <GlobalDashboard onClose={() => setShowGlobalDashboard(false)} />}
      {showMissions && <MissionsPanel onClose={() => setShowMissions(false)} />}
      {showDatabase && <DatabasePanel onClose={() => setShowDatabase(false)} />}
    </div>
  );
}

export default App;
