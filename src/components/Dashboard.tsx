import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Rocket, Battery, HardDrive, CloudLightning, 
  AlertTriangle, CheckCircle, Clock, Zap, Target, 
  BrainCircuit, Radar, Database, Activity, Globe 
} from 'lucide-react';

export function Dashboard({ selectedSatellite, setSelectedSatellite }: any) {
  const [activeTab, setActiveTab] = useState('TELEMETRY');
  
  // Simulated LIVE Telemetry State
  const [battery, setBattery] = useState(87.4);
  const [storage, setStorage] = useState(42.1); // Used space in TB
  const [tasks, setTasks] = useState<any[]>([
    { id: 1, type: 'Optical Scan', priority: 'Medium', status: 'Active', progress: 45 }
  ]);
  const [disasterMode, setDisasterMode] = useState(false);
  const [chaosEvent, setChaosEvent] = useState<string | null>(null);

  const isPlanner = selectedSatellite?.id ? selectedSatellite.id.toString().charCodeAt(0) % 2 === 0 : false;

  // Live simulation tick
  useEffect(() => {
    if (!selectedSatellite) return;
    
    // reset on new satellite
    setBattery(Math.random() * 20 + 80);
    setStorage(Math.random() * 30 + 10);
    setDisasterMode(false);
    setChaosEvent(null);
    setTasks([{ id: Date.now(), type: 'Standard Telemetry', priority: 'Low', status: 'Active', progress: 10 }]);

    const tick = setInterval(() => {
      setBattery(b => {
        let drain = 0.05;
        if (chaosEvent === 'solar_storm') drain = 0.3;
        if (tasks.length > 2) drain += 0.1;
        return Number(Math.max(0, b - drain).toFixed(2));
      });
      setStorage(s => {
        let fill = 0.02 * tasks.length;
        if (disasterMode) fill = 0.08;
        return Number(Math.min(100, s + fill).toFixed(2));
      });
      
      // Update tasks
      setTasks(current => current.map(t => {
        if (t.status === 'Active') {
          const newProgress = t.progress + (chaosEvent ? 0.5 : 2);
          if (newProgress >= 100) return { ...t, status: 'Completed', progress: 100 };
          return { ...t, progress: newProgress };
        }
        return t;
      }));
    }, 1000);
    return () => clearInterval(tick);
  }, [selectedSatellite, chaosEvent, disasterMode]);

  const scheduleTask = (priority: string) => {
    if (battery < 15 && priority !== 'Critical') return; // AI constraint
    
    const newTask = {
      id: Date.now(),
      type: disasterMode ? 'Emergency SAR Scan' : 'Routine Observation',
      priority: disasterMode ? 'Critical' : priority,
      status: 'Active',
      progress: 0
    };
    
    if (disasterMode) {
      // Reprioritize: pause non-critical
      setTasks(current => [
        newTask,
        ...current.map(t => t.priority !== 'Critical' ? { ...t, status: 'Paused' } : t)
      ]);
    } else {
      setTasks(current => [newTask, ...current]);
    }
  };

  const calculateScenario = () => {
     let best = 'C';
     if (disasterMode) best = 'A';
     if (battery < 30) best = 'B';
     return best;
  };

  if (!selectedSatellite) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="absolute right-4 md:right-8 top-8 bottom-8 w-full max-w-[420px] pointer-events-auto flex flex-col"
      >
        <div className={`flex-1 rounded-2xl overflow-hidden backdrop-blur-2xl border flex flex-col relative transition-colors duration-500 ${chaosEvent ? 'bg-red-900/40 border-red-500/50 shadow-[0_0_40px_rgba(255,0,0,0.3)] animate-none' : 'bg-space-900/60 border-neon-blue/20 shadow-[0_0_40px_rgba(0,100,255,0.15)]'}`}>
          
          {/* Header */}
          <div className="p-6 border-b border-white/5 relative bg-gradient-to-br from-white/5 to-transparent">
            {disasterMode && (
              <div className="absolute inset-x-0 top-0 h-1 bg-red-500 shadow-[0_0_20px_rgba(255,0,0,0.8)] animate-pulse" />
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Rocket className="w-5 h-5 text-neon-blue" />
                  <span className="text-xs tracking-[0.2em] font-black uppercase text-neon-blue">{selectedSatellite.agency} // INTEL</span>
                  {selectedSatellite.isPremium && (
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-gradient-to-r from-[#ffaa00] to-[#ff4400] text-black shadow-[0_0_8px_rgba(255,170,0,0.5)]">Flagship</span>
                  )}
                </div>
                <h2 className="text-3xl font-black text-white tracking-wide uppercase">{selectedSatellite.name}</h2>
              </div>
              <button onClick={() => setSelectedSatellite(null)} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-blue-200/70 uppercase tracking-widest font-bold">Orbit: {selectedSatellite.orbitType}</p>
            <p className="text-xs text-white/50 mt-1">{selectedSatellite.purpose}</p>

            {/* Overload / Chaos Warning */}
            {chaosEvent && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-2 bg-red-500/20 border border-red-500/50 rounded flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-red-400 capitalize">WARNING: {chaosEvent.replace('_', ' ')} INTERFERENCE DETECTED</span>
              </motion.div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-4 pt-4 gap-2 bg-black/20 overflow-x-auto scrollbar-hide">
             {['TELEMETRY', 'OPERATIONS', 'COGNITION', 'PERFORMANCE'].map(tab => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`flex-1 pb-3 text-[10px] font-black tracking-widest uppercase transition-colors relative ${activeTab === tab ? 'text-neon-blue' : 'text-white/40 hover:text-white/70'}`}
               >
                 {tab}
                 {activeTab === tab && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-neon-blue shadow-[0_0_10px_rgba(0,240,255,0.8)]" />}
               </button>
             ))}
          </div>

          {/* Scrolling Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            
            {/* TELEMETRY TAB */}
            {activeTab === 'TELEMETRY' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* Visual Orbit Track */}
                <div className="h-24 bg-black/40 rounded-xl relative overflow-hidden border border-white/5 flex items-center justify-center">
                  <div className="w-[80%] h-[1px] bg-neon-blue/30 absolute"></div>
                  <motion.div 
                     animate={{ x: [-100, 100] }} 
                     transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                     className="absolute w-3 h-3 rounded-full bg-neon-blue shadow-[0_0_15px_rgba(0,240,255,1)]" 
                  />
                  <div className="absolute bottom-2 left-3 text-[10px] font-mono text-neon-blue/70">ORBITAL VELOCITY: {(selectedSatellite.orbitSpeed * 7.5).toFixed(2)} km/s</div>
                  <div className="absolute top-2 right-3 text-[10px] font-mono text-white/50">ALT: {Math.floor(selectedSatellite.orbitRadius * 200)} km</div>
                </div>

                {/* Battery & Storage Grids */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2 text-blue-200/70"><Battery className="w-3 h-3"/><span className="text-[10px] tracking-widest uppercase">Power</span></div>
                       <span className={`text-xs font-mono font-bold ${battery < 20 ? 'text-red-400' : 'text-neon-blue'}`}>{battery.toFixed(1)}%</span>
                    </div>
                    <div className="h-1 w-full bg-black/50 rounded-full overflow-hidden">
                       <div className={`h-full ${battery < 20 ? 'bg-red-500 shadow-[0_0_10px_rgba(255,0,0,0.8)]' : 'bg-neon-blue shadow-[0_0_10px_rgba(0,240,255,0.8)]'}`} style={{ width: `${battery}%` }} />
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2 text-blue-200/70"><HardDrive className="w-3 h-3"/><span className="text-[10px] tracking-widest uppercase">Storage</span></div>
                       <span className="text-xs font-mono font-bold text-white">{storage.toFixed(1)} TB</span>
                    </div>
                    <div className="h-1 w-full bg-black/50 rounded-full overflow-hidden">
                       <div className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ width: `${storage}%` }} />
                    </div>
                  </div>
                </div>

                {/* Environmental Overview */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                   <h3 className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-3">Target Region Environment</h3>
                   <div className="flex justify-between items-center text-sm font-mono text-white/80">
                     <div className="flex flex-col items-center"><CloudLightning className="w-4 h-4 text-blue-300 mb-1" /><span className="text-[10px]">Cloud 34%</span></div>
                     <div className="flex flex-col items-center"><Radar className="w-4 h-4 text-green-400 mb-1" /><span className="text-[10px]">Vis 92/100</span></div>
                     <div className="flex flex-col items-center"><Activity className="w-4 h-4 text-yellow-400 mb-1" /><span className="text-[10px]">Nominal</span></div>
                   </div>
                </div>

                {/* Cognitive Role */}
                <div className={`border rounded-xl p-4 ${isPlanner ? 'bg-purple-900/20 border-purple-500/30' : 'bg-neon-blue/5 border-neon-blue/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit className={`w-4 h-4 ${isPlanner ? 'text-purple-400' : 'text-neon-blue'}`} />
                    <span className={`text-[10px] tracking-widest uppercase font-bold ${isPlanner ? 'text-purple-400' : 'text-neon-blue'}`}>
                      {isPlanner ? 'Planner Node' : 'Executor Node'}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 font-mono">
                    {isPlanner ? 'Coordinating fleet strategy & distributing tasks.' : 'Payload Execution & Direct Data Relay.'} 
                    <br/><span className="text-[10px] opacity-50 mt-1 block">(System Load: {(tasks.length * 15 + 12)}%)</span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* OPERATIONS TAB */}
            {activeTab === 'OPERATIONS' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* Disaster Protocol */}
                <div className={`p-4 rounded-xl border transition-colors ${disasterMode ? 'bg-red-500/20 border-red-500/50' : 'bg-black/40 border-white/5 hover:border-red-500/30'}`}>
                   <div className="flex justify-between items-center">
                     <div>
                       <h3 className={`text-sm font-bold tracking-widest ${disasterMode ? 'text-red-400' : 'text-white/60'}`}>DISASTER PRIORITY OVERRIDE</h3>
                       <p className="text-[10px] text-white/40 mt-1">Force preemptive imaging scans globally</p>
                     </div>
                     <button 
                       onClick={() => setDisasterMode(!disasterMode)}
                       className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${disasterMode ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(255,0,0,0.8)]' : 'bg-white/10 text-white'}`}
                     >
                       {disasterMode ? 'ACTIVE' : 'ENGAGE'}
                     </button>
                   </div>
                </div>

                {/* Scheduler */}
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <h3 className="text-[10px] font-bold tracking-widest text-white/40 uppercase">Satellite Task Scheduling Env</h3>
                    <div className="text-[8px] text-green-400 font-mono flex items-center gap-1 border border-green-400/20 px-1.5 py-0.5 rounded bg-green-400/10"><Target className="w-2 h-2"/> Reward: Maximize Data</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => scheduleTask('Low')} className="py-2 bg-white/5 rounded border border-white/10 text-[10px] font-bold text-white/70 hover:bg-white/10 flex flex-col items-center gap-1"><span className="text-blue-300"><CloudLightning className="w-3 h-3"/></span>ROUTINE</button>
                    <button onClick={() => scheduleTask('Medium')} className="py-2 bg-white/5 rounded border border-white/10 text-[10px] font-bold text-yellow-500 hover:bg-yellow-500/10 flex flex-col items-center gap-1"><span><Radar className="w-3 h-3"/></span>HIGH RES</button>
                    <button onClick={() => scheduleTask('Critical')} className="py-2 bg-white/5 rounded border border-white/10 text-[10px] font-bold text-red-400 hover:bg-red-500/10 flex flex-col items-center gap-1"><span><AlertTriangle className="w-3 h-3"/></span>URGENT</button>
                  </div>
                  <div className="mt-2 flex justify-between text-[8px] font-mono text-white/40 uppercase">
                     <span>Priority: Dynamic</span>
                     <span>Target: Weather & Surface</span>
                  </div>
                  {battery < 15 && <p className="text-xs text-red-400 mt-2 font-mono flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Warning: Insufficient power for Routine tasks.</p>}
                </div>

                {/* Task Queue */}
                <div className="space-y-2">
                   <h3 className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-2">Active Queue ({tasks.length})</h3>
                   {tasks.map(task => (
                      <div key={task.id} className="p-3 bg-white/5 border border-white/5 rounded-lg relative overflow-hidden">
                        {task.status === 'Active' && (
                          <div className="absolute inset-0 bg-neon-blue/10" style={{ width: `${task.progress}%` }} />
                        )}
                        <div className="relative flex justify-between items-center z-10">
                          <div>
                            <p className="text-xs font-bold text-white">{task.type}</p>
                            <span className="text-[10px] text-white/50">{task.priority} Priority</span>
                          </div>
                          <span className={`text-[10px] font-bold uppercase ${task.status==='Completed' ? 'text-green-400' : task.status==='Paused' ? 'text-yellow-400' : 'text-neon-blue animate-pulse'}`}>{task.status}</span>
                        </div>
                      </div>
                   ))}
                </div>

              </motion.div>
            )}

            {/* COGNITION TAB */}
            {activeTab === 'COGNITION' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                 
                 {/* Constraint Engine */}
                 <div>
                   <h3 className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-3">Cognitive Load Balancing</h3>
                   <div className="p-4 bg-black/40 border border-white/5 rounded-xl font-mono text-xs space-y-2 text-white/70">
                     <p className="flex justify-between"><span>Power Threshold:</span> <span className={battery > 30 ? 'text-green-400' : 'text-red-400'}>{battery > 30 ? 'OK' : 'CRITICAL'}</span></p>
                     <p className="flex justify-between"><span>Storage Matrix:</span> <span className={storage < 90 ? 'text-green-400' : 'text-red-400'}>{storage < 90 ? 'OK' : 'FILLING'}</span></p>
                     <p className="flex justify-between"><span>Orbital Visibility:</span> <span className="text-green-400">NOMINAL</span></p>
                     <div className="mt-3 pt-3 border-t border-white/10 text-white font-bold">
                       <Sparkles className="w-4 h-4 inline mr-2 text-neon-blue" />
                       Sys Rec: <span className="text-neon-blue">{battery > 30 ? "Clear to execute standard routines" : "Halt non-critical tasks. Charge cycle required."}</span>
                     </div>
                   </div>
                 </div>

                 {/* Global Attention */}
                 <div>
                   <h3 className="text-[10px] font-bold tracking-widest text-neon-blue uppercase mb-3 flex items-center gap-2"><Globe className="w-3 h-3"/> Global Attention Map</h3>
                   <div className={`bg-white/5 border rounded-xl p-4 flex items-center justify-center relative overflow-hidden h-24 transition-colors duration-500 ${disasterMode ? 'border-red-500/50' : 'border-white/5'}`}>
                     <div className={`absolute inset-0 mix-blend-screen transition-colors duration-500 ${disasterMode ? 'bg-red-900/30' : 'bg-blue-900/10'}`} />
                     <motion.div 
                       animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }} 
                       transition={{ duration: disasterMode ? 1.5 : 4, repeat: Infinity }}
                       className={`absolute w-12 h-12 rounded-full blur-xl ${disasterMode ? 'bg-red-500/60' : 'bg-neon-blue/40'}`}
                     />
                     <span className={`relative z-10 text-[10px] font-mono font-bold tracking-widest text-center whitespace-pre-line ${disasterMode ? 'text-red-400' : 'text-white'}`}>
                       {disasterMode ? "DISASTER ZONE DETECTED:\nAUTOMATICALLY SHIFTING FOCUS" : "ANALYZING HIGH-PRIORITY SECTORS"}
                     </span>
                   </div>
                 </div>

                 {/* Satellite Dreams Simulation */}
                 <div>
                   <div className="flex items-center justify-between mb-3">
                     <h3 className="text-[10px] font-bold tracking-widest text-neon-blue uppercase">Satellite Dreams Engine</h3>
                     <span className="text-[8px] bg-neon-blue/20 text-neon-blue px-1.5 py-0.5 rounded animate-pulse font-mono flex items-center gap-1 border border-neon-blue/30"><Activity className="w-2 h-2"/> SIMULATING</span>
                   </div>
                   <div className="grid grid-cols-3 gap-2">
                     <ScenarioCard title="Path A: Max Data" desc="High drain" isBest={calculateScenario() === 'A'} isDisaster={disasterMode} />
                     <ScenarioCard title="Path B: Safe Mode" desc="Conserve energy" isBest={calculateScenario() === 'B'} isDisaster={disasterMode} />
                     <ScenarioCard title="Path C: Optimal" desc="AI balanced rx" isBest={calculateScenario() === 'C'} isDisaster={disasterMode} />
                   </div>
                 </div>

                 {/* Chaos Controls */}
                 <div className="pt-4 border-t border-white/10">
                   <h3 className="text-[10px] font-bold tracking-widest text-red-500/80 uppercase mb-3">Chaos Testing Mode</h3>
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setChaosEvent('solar_storm')} className="p-2 border border-red-500/30 rounded text-[10px] font-bold text-red-400 hover:bg-red-500/10 uppercase">Induce Solar Flare</button>
                     <button onClick={() => setChaosEvent('sensor_fail')} className="p-2 border border-red-500/30 rounded text-[10px] font-bold text-red-400 hover:bg-red-500/10 uppercase">Blind Sensors</button>
                     <button onClick={() => scheduleTask('Critical')} className="p-2 border border-red-500/30 rounded text-[10px] font-bold text-red-400 hover:bg-red-500/10 uppercase col-span-2">Spam Overload Tasks</button>
                   </div>
                 </div>

              </motion.div>
            )}

            {/* PERFORMANCE TAB */}
            {activeTab === 'PERFORMANCE' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                 
                 {/* Top Level Metrics */}
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center">
                     <Database className="w-5 h-5 text-neon-blue mb-2" />
                     <span className="text-xl font-bold text-white font-mono">{(storage * 123.4).toFixed(0)}</span>
                     <span className="text-[10px] tracking-widest text-white/50 uppercase">Data (GB)</span>
                   </div>
                   <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center">
                     <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                     <span className="text-xl font-bold text-white font-mono">{Math.max(89, 99 - (tasks.length * 0.5)).toFixed(1)}%</span>
                     <span className="text-[10px] tracking-widest text-white/50 uppercase">Success</span>
                   </div>
                 </div>

                 {/* Efficiency Score */}
                 <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <Target className="w-4 h-4 text-neon-blue" />
                        <span className="text-[10px] font-bold tracking-widest uppercase">System Efficiency</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-neon-blue">{(battery * 0.5 + 40).toFixed(1)}/100</span>
                    </div>
                    {/* Visual Resource Graph / Bar */}
                    <div className="flex h-12 items-end gap-1 mb-2">
                       {Array.from({ length: 20 }).map((_, i) => {
                         const h = Math.sin(i * 0.5 + (Date.now() / 1000)) * 20 + 30 + (Math.random() * 10);
                         return (
                           <div key={i} className="flex-1 bg-neon-blue/20 rounded-t" style={{ height: `${h}%` }}>
                             <div className="w-full bg-neon-blue shadow-[0_0_8px_rgba(0,240,255,0.6)] rounded-t transition-all duration-300" style={{ height: `${Math.min(100, (battery / 100) * h)}%` }} />
                           </div>
                         )
                       })}
                    </div>
                    <div className="flex justify-between text-[8px] text-white/40 uppercase font-bold tracking-widest">
                      <span>T-24H</span>
                      <span>Now</span>
                    </div>
                 </div>

                 {/* Output Logs */}
                 <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                   <h3 className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-3 text-center">Recent Uplinks</h3>
                   <div className="space-y-2 font-mono text-[10px]">
                     <div className="flex justify-between text-white/60"><span className="text-neon-blue">PACKET_0x4A</span><span>2.4 GB</span><span>OK</span></div>
                     <div className="flex justify-between text-white/60"><span className="text-neon-blue">PACKET_0x4B</span><span>1.8 GB</span><span>OK</span></div>
                     <div className="flex justify-between text-white/60"><span className="text-neon-blue">PACKET_0x4C</span><span>{disasterMode ? '9.1 GB' : '0.5 GB'}</span><span className={disasterMode ? 'text-red-400' : 'text-yellow-400'}>{disasterMode ? 'WARN' : 'SYNC'}</span></div>
                   </div>
                 </div>

              </motion.div>
            )}

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Sparkles({ className }: any) {
  return <Zap className={className} />; // Fallback icon
}

function ScenarioCard({ title, desc, isBest, isDisaster }: any) {
  let bgClass = 'bg-white/5 border-white/5';
  let badgeClass = '';
  let shadowClass = '';
  
  if (isBest) {
    if (isDisaster) {
      bgClass = 'bg-red-500/10 border-red-500/50';
      badgeClass = 'bg-red-500 text-white';
      shadowClass = 'shadow-[0_0_10px_rgba(255,0,0,0.3)]';
    } else {
      bgClass = 'bg-neon-blue/10 border-neon-blue/50';
      badgeClass = 'bg-neon-blue text-black';
      shadowClass = 'shadow-[0_0_10px_rgba(0,240,255,0.3)]';
    }
  }

  return (
    <div className={`p-2 rounded-lg border transition-all relative overflow-hidden h-full flex flex-col justify-start ${bgClass} ${shadowClass}`}>
      {isBest && <div className={`absolute top-0 inset-x-0 py-0.5 text-[7px] text-center font-black uppercase tracking-widest ${badgeClass}`}>Best Path</div>}
      <h4 className={`text-[9px] font-bold mt-2 pt-1 ${isBest ? 'text-white' : 'text-white/70'}`}>{title}</h4>
      <p className="text-[8px] text-white/50 mt-1 leading-tight">{desc}</p>
    </div>
  );
}
