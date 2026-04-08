import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, CheckCircle2, Clock, AlertTriangle, Zap, RefreshCw, Play, WifiOff } from 'lucide-react';

const API = import.meta.env.MODE === 'production' ? '' : 'http://localhost:8000';

interface Task {
  id: string;
  location: [number, number];
  priority: string;
  battery_cost: number;
  storage_cost: number;
  assigned_to: string | null;
  completed: boolean;
  disaster_related: boolean;
}

interface Satellite {
  id: string;
  battery: number;
  role: string;
  active: boolean;
  tasks_completed: number;
  storage_used: number;
}

interface MissionState {
  tasks: Task[];
  satellites: Satellite[];
  step: number;
  max_steps: number;
  weather: string;
  disaster_active: boolean;
  total_reward: number;
  difficulty: string;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: 'text-red-300',    bg: 'bg-red-500/20',    border: 'border-red-500/40',    label: '🔴 CRITICAL' },
  high:     { color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/30', label: '🟠 HIGH' },
  medium:   { color: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: '🟡 MEDIUM' },
  low:      { color: 'text-blue-300',   bg: 'bg-blue-500/5',    border: 'border-blue-500/15',   label: '🔵 LOW' },
};

export function MissionsPanel({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<MissionState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [autoStep, setAutoStep] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const r = await fetch(`${API}/`, { signal: AbortSignal.timeout(2000) });
      setOnline(r.ok);
    } catch { setOnline(false); }
  }, []);

  useEffect(() => {
    checkHealth();
    const t = setInterval(checkHealth, 5000);
    return () => clearInterval(t);
  }, [checkHealth]);

  const startSession = async (diff: string) => {
    setLoading(true);
    try {
      const seed = Math.floor(Math.random() * 9999) + 1;
      const r = await fetch(`${API}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty: diff, seed }),
      });
      const data = await r.json();
      setSessionId(data.session_id);
      setState({ ...data.observation, difficulty: diff });
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!autoStep || !sessionId || !state) return;
    const interval = setInterval(async () => {
      if (!state) return;
      const priorities = ['critical', 'high', 'medium', 'low'];
      const executor = state.satellites.find(s => s.active && s.role === 'executor' && s.battery > 5);
      const task = [...state.tasks]
        .filter(t => !t.completed && !t.assigned_to)
        .sort((a, b) => priorities.indexOf(a.priority) - priorities.indexOf(b.priority))[0];
      const action = executor && task
        ? { type: 'assign_task', satellite_id: executor.id, task_id: task.id }
        : { type: 'skip' };
      try {
        const r = await fetch(`${API}/step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, action }),
        });
        const data = await r.json();
        setState({ ...data.observation, difficulty: state.difficulty });
        if (data.done) setAutoStep(false);
      } catch {}
    }, 800);
    return () => clearInterval(interval);
  }, [autoStep, sessionId, state]);

  const tasks = state?.tasks ?? [];
  const filtered = tasks.filter(t => {
    const pOk = filterPriority === 'all' || t.priority === filterPriority;
    const sOk = filterStatus === 'all'
      || (filterStatus === 'completed' && t.completed)
      || (filterStatus === 'assigned' && !t.completed && t.assigned_to)
      || (filterStatus === 'pending' && !t.completed && !t.assigned_to);
    return pOk && sOk;
  });

  const completed = tasks.filter(t => t.completed).length;
  const assigned  = tasks.filter(t => !t.completed && t.assigned_to).length;
  const pending   = tasks.filter(t => !t.completed && !t.assigned_to).length;
  const disaster  = tasks.filter(t => t.disaster_related && !t.completed).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="absolute inset-0 z-50 bg-[#030612]/96 backdrop-blur-3xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Target className="w-7 h-7 text-neon-blue" />
            <div>
              <h1 className="text-3xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-blue">
                Mission Control
              </h1>
              <p className="text-xs tracking-[0.3em] font-mono uppercase text-blue-300/60">
                Live Task Queue · Satellite Assignment Engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold tracking-widest ${online ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-red-500/40 bg-red-500/10 text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {online ? 'ONLINE' : 'OFFLINE'}
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 rounded-full transition-all group">
              <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </header>

        {!online ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/40">
            <WifiOff className="w-16 h-16 opacity-20" />
            <p className="font-mono text-base">Backend offline. Start the backend server first.</p>
            <code className="text-neon-blue bg-black/40 px-4 py-2 rounded text-sm">uvicorn main:app --reload --port 8000</code>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">

            {/* Left sidebar — controls */}
            <div className="w-72 flex-shrink-0 border-r border-white/10 bg-black/20 flex flex-col gap-4 p-5 overflow-y-auto">
              <div>
                <p className="text-xs font-black tracking-[0.25em] uppercase text-white/40 mb-3">Launch Mission</p>
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button key={d} onClick={() => startSession(d)} disabled={loading}
                    className={`w-full mb-2 px-4 py-3 rounded-xl border text-base font-bold uppercase tracking-wider transition-all ${state?.difficulty === d ? 'border-neon-blue bg-neon-blue/20 text-neon-blue' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'}`}>
                    {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d}
                  </button>
                ))}
              </div>

              <hr className="border-white/10" />

              {state && (
                <div>
                  <p className="text-xs font-black tracking-[0.25em] uppercase text-white/40 mb-3">AI Autopilot</p>
                  <button
                    onClick={() => setAutoStep(a => !a)}
                    className={`w-full px-4 py-3 rounded-xl border text-base font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${autoStep ? 'border-green-500/50 bg-green-500/20 text-green-400 animate-pulse' : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'}`}>
                    {autoStep ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running...</> : <><Play className="w-4 h-4" /> Start Auto</>}
                  </button>
                </div>
              )}

              <hr className="border-white/10" />

              <div>
                <p className="text-xs font-black tracking-[0.25em] uppercase text-white/40 mb-3">Filter by Priority</p>
                <div className="flex flex-col gap-1.5">
                  {['all', 'critical', 'high', 'medium', 'low'].map(p => (
                    <button key={p} onClick={() => setFilterPriority(p)}
                      className={`px-3 py-2 rounded-lg border text-sm font-bold uppercase tracking-wider transition-all text-left ${filterPriority === p ? 'border-neon-blue/50 bg-neon-blue/15 text-neon-blue' : 'border-white/5 bg-white/3 text-white/40 hover:bg-white/8'}`}>
                      {p === 'all' ? '⚡ All Priorities' : PRIORITY_CONFIG[p]?.label ?? p}
                    </button>
                  ))}
                </div>
                <p className="text-xs font-black tracking-[0.25em] uppercase text-white/40 mb-3 mt-3">Filter by Status</p>
                <div className="flex flex-col gap-1.5">
                  {['all', 'pending', 'assigned', 'completed'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-3 py-2 rounded-lg border text-sm font-bold uppercase tracking-wider transition-all text-left ${filterStatus === s ? 'border-neon-blue/50 bg-neon-blue/15 text-neon-blue' : 'border-white/5 bg-white/3 text-white/40 hover:bg-white/8'}`}>
                      {s === 'all' ? '📋 All Status' : s === 'pending' ? '⏳ Pending' : s === 'assigned' ? '🔗 Assigned' : '✅ Completed'}
                    </button>
                  ))}
                </div>
              </div>

              {state && (
                <>
                  <hr className="border-white/10" />
                  <div className="space-y-2">
                    <p className="text-xs font-black tracking-[0.25em] uppercase text-white/40 mb-2">Mission Stats</p>
                    {[
                      { label: 'Step', value: `${state.step}/${state.max_steps}`, color: 'text-white' },
                      { label: 'Reward', value: `+${state.total_reward.toFixed(2)}`, color: 'text-neon-blue' },
                      { label: 'Weather', value: state.weather.toUpperCase(), color: state.weather === 'clear' ? 'text-green-400' : 'text-yellow-400' },
                      { label: 'Disaster', value: state.disaster_active ? 'ACTIVE' : 'CLEAR', color: state.disaster_active ? 'text-red-400 animate-pulse' : 'text-green-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between items-center text-sm font-mono">
                        <span className="text-white/40 uppercase tracking-widest">{label}</span>
                        <span className={`font-bold ${color}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-h-0 p-6">
              {!state ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-white/30">
                  <Target className="w-20 h-20 opacity-10" />
                  <div className="text-center">
                    <p className="font-mono text-lg font-bold text-white/40">No Active Mission</p>
                    <p className="font-mono text-base mt-2">Select a difficulty and launch a mission</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="grid grid-cols-4 gap-3 mb-5 flex-shrink-0">
                    {[
                      { label: 'Completed', value: completed, color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5', icon: <CheckCircle2 className="w-4 h-4" /> },
                      { label: 'Assigned',  value: assigned,  color: 'text-neon-blue', border: 'border-blue-500/20',  bg: 'bg-blue-500/5',  icon: <Zap className="w-4 h-4" /> },
                      { label: 'Pending',   value: pending,   color: 'text-yellow-400',border: 'border-yellow-500/20',bg: 'bg-yellow-500/5',icon: <Clock className="w-4 h-4" /> },
                      { label: 'Disaster',  value: disaster,  color: 'text-red-400',   border: 'border-red-500/20',   bg: 'bg-red-500/5',   icon: <AlertTriangle className="w-4 h-4" /> },
                    ].map(({ label, value, color, border, bg, icon }) => (
                      <div key={label} className={`rounded-xl border ${border} ${bg} p-4 flex flex-col gap-2`}>
                        <div className={`flex items-center gap-2 ${color}`}>{icon}<span className="text-sm font-bold tracking-widest uppercase">{label}</span></div>
                        <span className={`text-3xl font-black ${color}`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Task list */}
                  <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-2 gap-3 content-start">
                    {filtered.length === 0 ? (
                      <div className="col-span-2 flex items-center justify-center py-16 text-white/30 font-mono text-sm">
                        No tasks match the current filter.
                      </div>
                    ) : filtered.map(task => {
                      const cfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.low;
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                            task.completed
                              ? 'border-green-500/20 bg-green-500/5 opacity-60'
                              : task.disaster_related
                              ? 'border-red-500/40 bg-red-500/8 shadow-[0_0_12px_rgba(255,0,0,0.08)]'
                              : `${cfg.border} ${cfg.bg}`
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-base font-black text-white font-mono">{task.id}</span>
                              {task.disaster_related && !task.completed && (
                                <span className="ml-2 text-sm text-red-400 font-bold">🚨 EMERGENCY</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {task.completed && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-3 text-sm font-mono text-white/50">
                            <span>🔋 -{task.battery_cost.toFixed(1)}%</span>
                            <span>💾 +{task.storage_cost.toFixed(1)}%</span>
                            <span className="ml-auto text-white/30">
                              [{task.location[0].toFixed(0)}°, {task.location[1].toFixed(0)}°]
                            </span>
                          </div>

                          <div className={`text-sm font-mono px-2 py-1 rounded border ${
                            task.completed
                              ? 'text-green-400 border-green-500/20 bg-green-500/5'
                              : task.assigned_to
                              ? 'text-neon-blue border-blue-500/20 bg-blue-500/5'
                              : 'text-white/40 border-white/10 bg-white/3'
                          }`}>
                            {task.completed
                              ? '✅ Completed'
                              : task.assigned_to
                              ? `🔗 → ${task.assigned_to}`
                              : '⏳ Awaiting assignment'}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
