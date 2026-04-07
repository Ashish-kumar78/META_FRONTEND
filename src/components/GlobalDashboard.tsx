import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Network, Activity, Globe, AlertOctagon, 
  Battery, HardDrive, ThermometerSun, Map, Target,
  Zap, CloudLightning, ShieldAlert, Cpu, ArrowLeft
} from 'lucide-react';

export function GlobalDashboard({ onClose }: { onClose: () => void }) {
  const [chaosEvent, setChaosEvent] = useState<string | null>(null);
  const [disasterMode, setDisasterMode] = useState(false);
  const [battery, setBattery] = useState(100);
  const [storage, setStorage] = useState(30);
  
  const [activePortal, setActivePortal] = useState<string | null>(null);

  // Simulation Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setBattery(b => {
        let drain = 0.2;
        if (chaosEvent === 'STORM') drain = 1.5;
        if (chaosEvent === 'OVERLOAD') drain = 2.0;
        return Math.max(0, b - drain);
      });
      setStorage(s => {
        let fill = 0.1;
        if (disasterMode) fill = 0.5;
        if (chaosEvent === 'OVERLOAD') fill = 1.0;
        return Math.min(100, s + fill);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [chaosEvent, disasterMode]);

  const scheduleTask = (type: string) => {
    if (battery < 10) return;
    setBattery(b => Math.max(0, b - 5));
    setStorage(s => Math.min(100, s + 3));
  };

  const getBestPath = () => {
    if (disasterMode) return 'A';
    if (battery < 40) return 'B';
    return 'C';
  };

  const portals = [
    { id: 'cognitive', title: 'Portal 1: Cognitive Load Balancing', desc: 'Not all satellites should process information equally.', icon: Cpu },
    { id: 'chaos', title: 'Portal 2: Chaos Testing Mode', desc: 'A feature that demonstrates the system’s robustness by simulating failures and task overloads.', icon: AlertOctagon },
    { id: 'dreams', title: 'Portal 3: Satellite Dreams', desc: 'The system simulates multiple futures and selects the best course of action.', icon: Target },
    { id: 'attention', title: 'Portal 4: Global Attention & Disaster', desc: 'A feature that detects disaster zones and shifts satellite focus to prioritize urgent areas.', icon: Globe },
    { id: 'scheduling', title: 'Portal 5: Task Scheduling Environment', desc: 'Control and schedule satellite tasks related to Earth observation.', icon: HardDrive }
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className={`absolute inset-0 z-50 p-6 flex flex-col transition-colors duration-700 ${chaosEvent ? 'bg-red-950/90' : 'bg-[#030612]/95'} backdrop-blur-3xl overflow-hidden`}
      >
        {/* Chaos Vignette */}
        {chaosEvent && (
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(255,0,0,0.4)] animate-pulse" />
        )}

        {/* Global Nav */}
        <header className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <Network className={`w-8 h-8 ${chaosEvent ? 'text-red-500' : 'text-neon-blue'}`} />
            <div>
              <h1 className={`text-2xl font-black tracking-widest uppercase ${chaosEvent ? 'text-red-500' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-blue'}`}>
                Nexus Global Command
              </h1>
              <p className={`text-[10px] tracking-[0.3em] font-mono uppercase ${chaosEvent ? 'text-red-400' : 'text-blue-300'}`}>Omni-Directional Satellite Oversight</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {activePortal && (
              <button onClick={() => setActivePortal(null)} className="px-4 py-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white rounded font-bold tracking-wider text-xs uppercase flex items-center gap-2 transition-all">
                <ArrowLeft className="w-4 h-4" /> Back to Portals
              </button>
            )}
            <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 rounded-full transition-all group">
              <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 relative z-10 overflow-y-auto">
          {!activePortal ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portals.map(portal => (
                <button
                  key={portal.id}
                  onClick={() => setActivePortal(portal.id)}
                  className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col items-start gap-4 hover:border-neon-blue/50 hover:bg-neon-blue/10 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-neon-blue/20 flex items-center justify-center border border-neon-blue/40 group-hover:scale-110 transition-transform">
                    <portal.icon className="w-6 h-6 text-neon-blue" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-widest text-white uppercase">{portal.title}</h2>
                    <p className="text-xs text-white/50 mt-2 font-mono">{portal.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="w-full flex justify-center h-full">
              {/* PORTAL 1: Cognitive Load Balancing */}
              {activePortal === 'cognitive' && (
                <div className="w-full max-w-3xl bg-black/40 border border-white/10 rounded-2xl p-8 flex flex-col h-full relative">
                  <div className="flex items-center gap-3 mb-6">
                    <Cpu className="text-purple-400 w-8 h-8" />
                    <div>
                      <h2 className="text-xl font-black tracking-widest text-purple-400 uppercase">Cognitive Load Balancing</h2>
                      <p className="text-sm text-white/50 font-mono">Role Assignment Configuration</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 mb-8 leading-relaxed font-mono">
                    Not all satellites should process information equally. This portal controls the role assignments between planners and executors to significantly reduce system overload, distribute compute tasks safely, and prevent networking chaos during massive data ingestion.
                  </p>
                  
                  <div className="space-y-6 flex-1">
                    <div className="p-6 bg-purple-900/20 border border-purple-500/30 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                      <div className="flex justify-between items-center mb-4 relative z-10">
                        <span className="text-lg font-bold text-white tracking-wider uppercase">Planner Constellation</span>
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full font-mono">3 Active Nodes</span>
                      </div>
                      <p className="text-xs text-white/60 relative z-10">Strategizing tasks, computing orbital overlaps, and distributing execution commands across the entire network mesh.</p>
                      <div className="mt-4 h-2 w-full bg-black rounded-full overflow-hidden relative z-10">
                        <div className="h-full bg-purple-500 w-[82%] shadow-[0_0_15px_#a855f7]" />
                      </div>
                    </div>

                    <div className="p-6 bg-neon-blue/10 border border-neon-blue/30 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/10 rounded-full blur-3xl" />
                      <div className="flex justify-between items-center mb-4 relative z-10">
                        <span className="text-lg font-bold text-white tracking-wider uppercase">Executor Constellation</span>
                        <span className="text-xs bg-neon-blue/20 text-blue-300 px-3 py-1 rounded-full font-mono">14 Active Nodes</span>
                      </div>
                      <p className="text-xs text-white/60 relative z-10">Handling raw task execution, specific physical payload maneuvers, target photography, and direct data relay back to Earth ground stations.</p>
                      <div className="mt-4 h-2 w-full bg-black rounded-full overflow-hidden relative z-10">
                        <div className="h-full bg-neon-blue w-[45%] shadow-[0_0_15px_#0ff]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PORTAL 2: Chaos Testing Mode */}
              {activePortal === 'chaos' && (
                <div className="w-full max-w-2xl bg-black/40 border border-red-500/20 rounded-2xl p-8 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <AlertOctagon className="text-red-500 w-8 h-8 animate-pulse" />
                    <div>
                      <h2 className="text-xl font-black tracking-widest text-red-500 uppercase">Chaos Testing Mode (Demo Killer)</h2>
                      <p className="text-sm text-red-500/50 font-mono">Simulate System Disruptions</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 mb-8 font-mono leading-relaxed">
                    A dedicated feature that demonstrates the system’s robustness by simulating intense external failures, deep system glitches, and task overloads. Used to showcase system resilience in extreme operational zones.
                  </p>
                  
                  <div className="flex flex-col gap-4">
                    <button onClick={() => setChaosEvent(chaosEvent === 'STORM' ? null : 'STORM')} className={`p-6 rounded-xl border text-sm font-bold uppercase transition-all flex items-center justify-between ${chaosEvent === 'STORM' ? 'bg-red-500 text-white border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.4)]' : 'bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-lg">Solar Storm Event</span>
                        <span className="text-[10px] opacity-70 font-mono tracking-widest">Generates harsh space weather, depleting batteries instantly</span>
                      </div>
                      {chaosEvent === 'STORM' ? <span className="animate-pulse bg-white/20 px-3 py-1 rounded">ENGAGED</span> : <span>ACTIVATE</span>}
                    </button>
                    
                    <button onClick={() => setChaosEvent(chaosEvent === 'SYSTEM_FAIL' ? null : 'SYSTEM_FAIL')} className={`p-6 rounded-xl border text-sm font-bold uppercase transition-all flex items-center justify-between ${chaosEvent === 'SYSTEM_FAIL' ? 'bg-red-500 text-white border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.4)]' : 'bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-lg">Cascade System Failure</span>
                        <span className="text-[10px] opacity-70 font-mono tracking-widest">Forces nodes offline to measure mesh-network self-healing</span>
                      </div>
                      {chaosEvent === 'SYSTEM_FAIL' ? <span className="animate-pulse bg-white/20 px-3 py-1 rounded">ENGAGED</span> : <span>ACTIVATE</span>}
                    </button>
                    
                    <button onClick={() => setChaosEvent(chaosEvent === 'OVERLOAD' ? null : 'OVERLOAD')} className={`p-6 rounded-xl border text-sm font-bold uppercase transition-all flex items-center justify-between ${chaosEvent === 'OVERLOAD' ? 'bg-red-500 text-white border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.4)]' : 'bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-lg">Task Overload Attack</span>
                        <span className="text-[10px] opacity-70 font-mono tracking-widest">Spams the planner nodes with a billion execution commands simultaneously</span>
                      </div>
                      {chaosEvent === 'OVERLOAD' ? <span className="animate-pulse bg-white/20 px-3 py-1 rounded">ENGAGED</span> : <span>ACTIVATE</span>}
                    </button>
                  </div>
                </div>
              )}

              {/* PORTAL 3: Satellite Dreams */}
              {activePortal === 'dreams' && (
                <div className="w-full bg-black/40 border border-white/10 rounded-2xl flex flex-col overflow-hidden h-full">
                  <div className="p-8 border-b border-white/5 bg-gradient-to-br from-neon-blue/5 to-transparent flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-black tracking-widest text-neon-blue uppercase">Satellite Dreams: Future Simulation Engine</h2>
                      <p className="text-xs text-white/50 font-mono mt-2 max-w-2xl">The system rapidly simulates multiple immediate futures and selects the most optimal course of action based on current battery levels, task priorities, and disaster scenarios. We observe the AI making these choices in real time.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-neon-blue/10 px-4 py-2 border border-neon-blue/30 rounded-lg">
                      <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-neon-blue"></span></span>
                      <span className="text-[10px] tracking-widest font-mono text-neon-blue uppercase font-bold">LIVE NEURAL SIM</span>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                    {/* Path A */}
                    <div className={`p-8 relative flex flex-col justify-between transition-colors ${getBestPath() === 'A' ? 'bg-green-500/10' : 'bg-transparent'}`}>
                      {getBestPath() === 'A' && <div className="absolute top-0 inset-x-0 h-1 bg-green-500 shadow-[0_0_20px_#22c55e]" />}
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">Path A: Maximum Data Harvest</h3>
                        <p className="text-xs text-white/60 font-mono mb-6 leading-relaxed">Maximum sensor engagement. Prioritizes extremely high-res Earth imagery over battery conservation. Chosen during critical disaster operations.</p>
                        <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
                          <p className="text-sm flex justify-between text-white/70 font-bold"><span>Projected Data Yield:</span> <span className="text-green-400">98% OPTIMAL</span></p>
                          <p className="text-sm flex justify-between text-white/70 font-bold"><span>Battery Threat Level:</span> <span className="text-red-400">CRITICAL (-40%)</span></p>
                        </div>
                      </div>
                      <div className="mt-8 flex justify-center">
                        {getBestPath() === 'A' ? <span className="bg-green-500 text-black text-xs font-black px-4 py-2 rounded uppercase shadow-[0_0_20px_#22c55e]">SELECTED BY ENGINE</span> : <span className="text-white/20 text-xs font-bold tracking-widest">SIMULATED</span>}
                      </div>
                    </div>

                    {/* Path B */}
                    <div className={`p-8 relative flex flex-col justify-between transition-colors ${getBestPath() === 'B' ? 'bg-yellow-500/10' : 'bg-transparent'}`}>
                      {getBestPath() === 'B' && <div className="absolute top-0 inset-x-0 h-1 bg-yellow-500 shadow-[0_0_20px_#eab308]" />}
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">Path B: Deep Hibernation</h3>
                        <p className="text-xs text-white/60 font-mono mb-6 leading-relaxed">Halts non-essential planetary scanning. Focuses entirely on minimal telemetry relay and aggressive solar charging to survive critical battery shortages.</p>
                        <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
                          <p className="text-sm flex justify-between text-white/70 font-bold"><span>Projected Data Yield:</span> <span className="text-red-400">12% USELESS</span></p>
                          <p className="text-sm flex justify-between text-white/70 font-bold"><span>Battery Threat Level:</span> <span className="text-green-400">SAFE (+10%)</span></p>
                        </div>
                      </div>
                      <div className="mt-8 flex justify-center">
                        {getBestPath() === 'B' ? <span className="bg-yellow-500 text-black text-xs font-black px-4 py-2 rounded uppercase shadow-[0_0_20px_#eab308]">SELECTED BY ENGINE</span> : <span className="text-white/20 text-xs font-bold tracking-widest">SIMULATED</span>}
                      </div>
                    </div>

                    {/* Path C */}
                    <div className={`p-8 relative flex flex-col justify-between transition-colors ${getBestPath() === 'C' ? 'bg-neon-blue/10' : 'bg-transparent'}`}>
                      {getBestPath() === 'C' ? <div className="absolute top-0 inset-x-0 h-1 bg-neon-blue shadow-[0_0_20px_#0ff]" /> : null}
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">Path C: Balanced Nomad</h3>
                        <p className="text-xs text-white/60 font-mono mb-6 leading-relaxed">Standard predictive scheduling pattern. Harmonizes nominal data capture with safe operational margins during peaceful, non-crisis periods.</p>
                        <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
                          <p className="text-sm flex justify-between text-white/70 font-bold"><span>Projected Data Yield:</span> <span className="text-neon-blue">65% ADEQUATE</span></p>
                          <p className="text-sm flex justify-between text-white/70 font-bold"><span>Battery Threat Level:</span> <span className="text-neon-blue">NOMINAL (-12%)</span></p>
                        </div>
                      </div>
                      <div className="mt-8 flex justify-center">
                        {getBestPath() === 'C' ? <span className="bg-neon-blue text-black text-xs font-black px-4 py-2 rounded uppercase shadow-[0_0_20px_#0ff]">SELECTED BY ENGINE</span> : <span className="text-white/20 text-xs font-bold tracking-widest">SIMULATED</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PORTAL 4: Global Attention */}
              {activePortal === 'attention' && (
                <div className={`w-full max-w-4xl rounded-2xl border flex flex-col relative overflow-hidden transition-all duration-700 p-8 ${disasterMode ? 'border-red-500 border-2 bg-red-950/20 shadow-[0_0_80px_rgba(255,0,0,0.2)]' : 'border-white/10 bg-black/40'}`}>
                  <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Equirectangular_projection_SW.jpg')] bg-cover bg-center opacity-10 mix-blend-screen" />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className={`text-2xl font-black tracking-widest uppercase mb-2 ${disasterMode ? 'text-red-500' : 'text-white'}`}>Global Attention & Disaster Priority</h2>
                        <p className="text-sm text-white/70 font-mono max-w-2xl leading-relaxed">
                          A real-world impact feature that actively monitors planetary events. Upon detecting catastrophic events in specific sectors, it unilaterally overrides all local satellite tasks, forcing a massive orbital attention shift toward urgent disaster areas.
                        </p>
                      </div>
                      <button 
                        onClick={() => setDisasterMode(!disasterMode)}
                        className={`px-6 py-3 rounded-xl font-black tracking-widest text-xs uppercase transition-all shadow-lg border relative overflow-hidden ${disasterMode ? 'bg-red-500 text-white border-red-400 shadow-[0_0_30px_rgba(255,0,0,0.5)] scale-105' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                      >
                        {disasterMode && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                        <span className="relative z-10">{disasterMode ? 'ABORT DISASTER PROTOCOL' : 'DETECT SIMULATED DISASTER'}</span>
                      </button>
                    </div>

                    <div className="flex-1 mt-8 relative flex items-center justify-center bg-black/50 rounded-2xl border border-white/5 overflow-hidden min-h-[400px]">
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,0.03)_2px,transparent_2px)] bg-[size:60px_60px]" />
                      
                      {disasterMode ? (
                        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute flex flex-col items-center justify-center">
                          <div className="w-[400px] h-[400px] border-2 border-red-500/50 rounded-full animate-ping absolute opacity-20" />
                          <div className="w-[300px] h-[300px] border border-red-500/50 rounded-full animate-ping absolute opacity-40" />
                          
                          <div className="w-48 h-48 bg-red-500/20 border-4 border-red-500 rounded-full flex flex-col items-center justify-center relative z-10 backdrop-blur-md shadow-[0_0_60px_#ef4444]">
                            <Map className="w-16 h-16 text-red-100 animate-bounce mb-2" />
                            <span className="text-white font-bold text-center text-xs tracking-widest uppercase">Target Area</span>
                          </div>
                          
                          <div className="absolute top-[210px] whitespace-nowrap bg-red-500 text-white text-sm font-black px-6 py-2 rounded-lg tracking-[0.3em] uppercase shadow-lg border border-red-400 z-20">
                            CRITICAL PRIORITY: SECTOR GAMMA
                          </div>
                          <div className="absolute top-[260px] text-red-300 font-mono text-xs text-center w-64 bg-black/80 p-2 rounded border border-red-500/30">
                            Swarm shifted. 100% bandwidth dedicated to Earth observation in this sector.
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex flex-wrap gap-12 justify-center opacity-50 relative z-10">
                          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="flex flex-col items-center gap-3">
                            <Globe className="w-12 h-12 text-neon-blue" />
                            <span className="text-xs font-mono text-neon-blue font-bold tracking-widest">SECTOR ALPHA - NOMINAL</span>
                          </motion.div>
                          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="flex flex-col items-center gap-3">
                            <Globe className="w-12 h-12 text-neon-blue" />
                            <span className="text-xs font-mono text-neon-blue font-bold tracking-widest">SECTOR BETA - NOMINAL</span>
                          </motion.div>
                          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3.5 }} className="flex flex-col items-center gap-3">
                            <Globe className="w-12 h-12 text-neon-blue" />
                            <span className="text-xs font-mono text-neon-blue font-bold tracking-widest">SECTOR DELTA - NOMINAL</span>
                          </motion.div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PORTAL 5: Task Scheduling Env */}
              {activePortal === 'scheduling' && (
                <div className="w-full max-w-2xl bg-black/40 border border-white/10 rounded-2xl p-8 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <HardDrive className="text-blue-400 w-8 h-8" />
                    <div>
                      <h2 className="text-xl font-black tracking-widest text-blue-400 uppercase">Task Scheduling Environment</h2>
                      <p className="text-sm text-white/50 font-mono">Resource & Queue Management</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 mb-8 font-mono leading-relaxed">
                    Directly control and schedule individual satellite tasks based on planetary observation goals. This portal enforces physical constraints such as memory fullness, harsh weather affecting sensors, and battery draw rates.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Constraints Overview */}
                    <div>
                      <h3 className="text-xs font-black text-white/70 uppercase tracking-[0.2em] mb-4">Live System Constraints</h3>
                      <div className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/10">
                          <div className="flex items-center gap-3">
                            <ThermometerSun className={`w-5 h-5 ${chaosEvent === 'STORM' ? 'text-red-500' : 'text-yellow-500'}`}/>
                            <span className="text-xs font-mono text-white/70">Weather Threat</span>
                          </div>
                          <span className={`text-xs font-bold font-mono tracking-widest uppercase ${chaosEvent ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {chaosEvent === 'STORM' ? 'SOLAR FLARES' : 'CLEAR NULL'}
                          </span>
                        </div>

                        <div className="bg-white/5 p-4 rounded-xl flex flex-col gap-2 border border-white/10">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <Battery className={`w-5 h-5 ${battery < 20 ? 'text-red-500' : 'text-neon-blue'}`}/>
                              <span className="text-xs font-mono text-white/70">Charge Status</span>
                            </div>
                            <span className={`text-xs font-bold font-mono tracking-widest ${battery < 20 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                              {battery.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                            <div className={`h-full ${battery < 20 ? 'bg-red-500' : 'bg-neon-blue'} transition-all`} style={{ width: `${battery}%` }} />
                          </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-xl flex flex-col gap-2 border border-white/10">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <HardDrive className={`w-5 h-5 ${storage > 80 ? 'text-red-500' : 'text-white/70'}`}/>
                              <span className="text-xs font-mono text-white/70">Memory Bank</span>
                            </div>
                            <span className={`text-xs font-bold font-mono tracking-widest ${storage > 80 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                              {storage.toFixed(1)}% FULL
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                            <div className={`h-full ${storage > 80 ? 'bg-red-500' : 'bg-white/70'} transition-all`} style={{ width: `${storage}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black text-white/70 uppercase tracking-[0.2em] mb-4">Command Queue Execution</h3>
                      <div className="flex flex-col gap-3 flex-1">
                        <button onClick={() => scheduleTask('routine')} className="flex-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-xl font-bold text-xs uppercase hover:bg-blue-500/20 hover:border-blue-500/50 transition-all flex items-center justify-center tracking-widest">
                          Queue Routine Scan
                        </button>
                        <button onClick={() => scheduleTask('high-res')} className="flex-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-xl font-bold text-xs uppercase hover:bg-purple-500/20 hover:border-purple-500/50 transition-all flex items-center justify-center tracking-widest">
                          Request High-Res Imagery
                        </button>
                        <button onClick={() => scheduleTask('sar')} className="flex-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-xl font-bold text-xs uppercase hover:bg-yellow-500/20 hover:border-yellow-500/50 transition-all flex items-center justify-center tracking-widest">
                          Initiate Deep Radar (SAR)
                        </button>
                        <div className="mt-auto bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold tracking-[0.2em] text-green-400 uppercase mb-1 text-center">Reward Function Rating</span>
                          <span className="text-xl font-black text-green-400 font-mono">{(100 - storage).toFixed(0)}% RTD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
