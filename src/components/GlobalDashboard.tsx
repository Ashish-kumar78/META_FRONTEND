import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Network, Globe, AlertOctagon,
  Battery, HardDrive, ThermometerSun, Map, Target,
  Cpu, ArrowLeft, Wifi, WifiOff, Play, RefreshCw, Zap, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import L from 'leaflet';

// Robust dynamic API URL construction for nested iframes (e.g., Hugging Face Spaces)
const API = import.meta.env.MODE === 'production' 
  ? (window.location.pathname === '/' ? '' : window.location.pathname.replace(/\/$/, '')) 
  : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000');

// ─── Types ───────────────────────────────────────────────────────────────────
interface Satellite { id: string; battery: number; position: [number,number]; role: string; active: boolean; tasks_completed: number; storage_used: number; }
interface Task { id: string; location: [number,number]; priority: string; battery_cost: number; storage_cost: number; assigned_to: string|null; completed: boolean; disaster_related: boolean; }
interface EnvState { satellites: Satellite[]; tasks: Task[]; weather: string; disaster_active: boolean; disaster_sector: [number,number]|null; step: number; max_steps: number; difficulty: string; total_reward: number; done?: boolean; }
interface GradeResult { score: number; breakdown: Record<string,any>; }

// ─── Hook: Backend Connection ─────────────────────────────────────────────────
function useBackend() {
  const [online, setOnline] = useState(false);
  const [sessionId, setSessionId] = useState<string|null>(null);
  const [envState, setEnvState] = useState<EnvState|null>(null);
  const [grade, setGrade] = useState<GradeResult|null>(null);
  const [loading, setLoading] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>('—');
  const [difficulty, setDifficulty] = useState<'easy'|'medium'|'hard'>('easy');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [done, setDone] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(5000) });
      setOnline(r.ok);
    } catch { setOnline(false); }
  }, []);

  useEffect(() => {
    checkHealth();
    const t = setInterval(checkHealth, 5000);
    return () => clearInterval(t);
  }, [checkHealth]);

  const startSession = async (diff: 'easy'|'medium'|'hard') => {
    setLoading(true);
    setGrade(null);
    setDone(false);
    try {
      const seed = Math.floor(Math.random() * 9999) + 1;
      const r = await fetch(`${API}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty: diff, seed }),
      });
      const data = await r.json();
      setSessionId(data.session_id);
      setEnvState(data.observation);
      setDifficulty(diff);
      setLastEvent(`▶ Episode started — ${diff.toUpperCase()} (seed:${seed})`);
    } catch { setLastEvent('❌ Failed to connect to backend'); }
    setLoading(false);
  };

  const sendAction = async (action: Record<string,any>) => {
    if (!sessionId || done) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, action }),
      });
      const data = await r.json();
      setEnvState({ ...data.observation, done: data.done });
      setDone(data.done);
      const label = action.type === 'assign_task'
        ? `⚡ ${action.task_id} → ${action.satellite_id} (+${data.reward?.toFixed(2)})`
        : action.type === 'change_role'
        ? `🔄 Role switch: ${action.satellite_id}`
        : `⏭ Skip (+${data.reward?.toFixed(2)})`;
      setLastEvent(label);
      if (data.done && data.final_score) { setGrade(data.final_score); setLastEvent(`🏁 Episode done! Score: ${(data.final_score.score*100).toFixed(1)}%`); }
    } catch { setLastEvent('❌ Action failed'); }
    setLoading(false);
  };

  const fetchGrade = async () => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${API}/grade/${sessionId}`, { method: 'POST' });
      const data = await r.json();
      setGrade(data.result);
      setLastEvent(`📊 Score: ${(data.result.score * 100).toFixed(1)}%`);
    } catch {}
  };

  const fetchLeaderboard = useCallback(async () => {
    try {
      const r = await fetch(`${API}/leaderboard`);
      const data = await r.json();
      setLeaderboard(data.leaderboard || []);
    } catch {}
  }, []);

  const fetchValidation = useCallback(async () => {
    try {
      const r = await fetch(`${API}/validate`);
      const data = await r.json();
      setValidation(data);
      setLastEvent(`✓ Validation: ${data.validation_status}`);
    } catch {}
  }, []);

  return {
    online, sessionId, envState, grade, loading, lastEvent, difficulty, done,
    leaderboard, validation,
    startSession, sendAction, fetchGrade, fetchLeaderboard, fetchValidation,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatusDot = ({ online }: { online: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold tracking-widest ${online ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-red-500/40 bg-red-500/10 text-red-400'}`}>
    {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
    {online ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
  </div>
);

const WeatherBadge = ({ weather }: { weather: string }) => {
  const map: Record<string, { color: string; label: string }> = {
    clear: { color: 'text-green-400 border-green-500/30 bg-green-500/10', label: '☀ CLEAR' },
    storm: { color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', label: '⛈ STORM' },
    solar_flare: { color: 'text-red-400 border-red-500/30 bg-red-500/10', label: '☀ SOLAR FLARE' },
    overload: { color: 'text-orange-400 border-orange-500/30 bg-orange-500/10', label: '⚡ OVERLOAD' },
  };
  const s = map[weather] || map.clear;
  return <span className={`px-3 py-1 rounded border text-xs font-bold font-mono ${s.color}`}>{s.label}</span>;
};

const MiniBar = ({ value, color }: { value: number; color: string }) => (
  <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden">
    <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
  </div>
);

// ─── Portal: Live RL Dashboard ────────────────────────────────────────────────
function LiveDashboard({ envState, grade, loading, lastEvent, difficulty, done,
  leaderboard, validation, startSession, sendAction, fetchGrade, fetchLeaderboard, fetchValidation }:
  {
    envState: EnvState|null; grade: GradeResult|null; loading: boolean; lastEvent: string;
    difficulty: string; done: boolean; leaderboard: any[]; validation: any;
    startSession: (d: any) => void; sendAction: (a: any) => void; fetchGrade: () => void;
    fetchLeaderboard: () => void; fetchValidation: () => void;
  }
) {
  const completedTasks = envState ? envState.tasks.filter(t => t.completed).length : 0;
  const pendingTasks = envState ? envState.tasks.filter(t => !t.completed).length : 0;
  const activeSats = envState ? envState.satellites.filter(s => s.active).length : 0;
  const pendingTasksList = envState ? envState.tasks.filter(t => !t.completed && !t.assigned_to) : [];

  return (
    <div className="w-full flex flex-col gap-4 h-full">
      {/* Top status bar */}
      {envState && (
        <div className="flex flex-wrap gap-3 items-center p-4 bg-black/40 border border-white/10 rounded-xl">
          <WeatherBadge weather={envState.weather} />
          {envState.disaster_active && (
            <span className="px-3 py-1 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-xs font-bold font-mono animate-pulse">
              🚨 DISASTER ACTIVE — SECTOR {envState.disaster_sector?.map(n => n.toFixed(0)).join(', ')}
            </span>
          )}
          <span className="ml-auto text-sm font-mono text-white/50">Step {envState.step}/{envState.max_steps}</span>
          <span className="text-sm font-mono text-neon-blue font-bold">Reward: +{envState.total_reward.toFixed(2)}</span>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Satellites */}
        <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 overflow-y-auto scroll-smooth">
          <h3 className="text-sm font-black tracking-[0.2em] text-white/60 uppercase">Satellites ({activeSats}/{envState?.satellites.length ?? 0} Active)</h3>
          {envState ? envState.satellites.map(sat => (
            <div key={sat.id} className={`p-4 rounded-xl border transition-all ${sat.active ? 'border-white/10 bg-white/5' : 'border-red-500/20 bg-red-500/5 opacity-50'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-white font-mono">{sat.id}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${sat.role === 'executor' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-purple-500/20 text-purple-400'}`}>{sat.role}</span>
                  {!sat.active && <XCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/50 font-mono"><span>🔋 Battery</span><span className={sat.battery < 20 ? 'text-red-400' : 'text-white'}>{sat.battery.toFixed(1)}%</span></div>
                <MiniBar value={sat.battery} color={sat.battery < 20 ? 'bg-red-500' : 'bg-neon-blue'} />
                <div className="flex justify-between text-xs text-white/50 font-mono"><span>💾 Storage</span><span className={sat.storage_used > 80 ? 'text-red-400' : 'text-white'}>{sat.storage_used.toFixed(1)}%</span></div>
                <MiniBar value={sat.storage_used} color={sat.storage_used > 80 ? 'bg-red-500' : 'bg-white/40'} />
                <div className="text-xs text-white/40 font-mono">Tasks done: {sat.tasks_completed}</div>
              </div>
            </div>
          )) : <div className="text-sm text-white/30 font-mono text-center mt-8">Start a session to see live satellites</div>}
        </div>

        {/* Middle: Tasks */}
        <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 overflow-y-auto scroll-smooth">
          <h3 className="text-sm font-black tracking-[0.2em] text-white/60 uppercase">Tasks ✅{completedTasks} ⏳{pendingTasks}</h3>
          {envState ? envState.tasks.map(task => (
            <div key={task.id} className={`p-4 rounded-xl border text-xs font-mono transition-all ${
              task.completed ? 'border-green-500/20 bg-green-500/5 opacity-60'
              : task.disaster_related ? 'border-red-500/40 bg-red-500/10 animate-pulse'
              : 'border-white/10 bg-white/5'}`}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-white text-sm">{task.id}</span>
                <div className="flex gap-1 items-center">
                  {task.completed && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  {task.disaster_related && !task.completed && <span className="text-red-400 font-bold">🚨</span>}
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-xs ${
                    task.priority === 'critical' ? 'bg-red-500/30 text-red-300'
                    : task.priority === 'high' ? 'bg-orange-500/30 text-orange-300'
                    : task.priority === 'medium' ? 'bg-yellow-500/30 text-yellow-300'
                    : 'bg-white/10 text-white/60'}`}>{task.priority}</span>
                </div>
              </div>
              <div className="text-white/50 text-xs">🔋 -{task.battery_cost.toFixed(1)}% | 💾 +{task.storage_cost.toFixed(1)}%</div>
              {task.assigned_to && <div className="text-green-400/70 mt-1 text-xs">→ {task.assigned_to}</div>}
            </div>
          )) : <div className="text-sm text-white/30 font-mono text-center mt-8">No tasks loaded</div>}
        </div>

        {/* Right: Actions */}
        <div className="w-72 bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 overflow-y-auto scroll-smooth min-h-0">
          <h3 className="text-sm font-black tracking-[0.2em] text-white/60 uppercase">Command Queue</h3>

          {/* Difficulty selector */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Start New Episode</p>
            {(['easy','medium','hard'] as const).map(d => (
              <button key={d} onClick={() => startSession(d)} disabled={loading}
                className={`px-4 py-2.5 rounded-lg border text-sm font-bold uppercase tracking-wider transition-all ${difficulty === d && envState ? 'border-neon-blue bg-neon-blue/20 text-neon-blue' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'}`}>
                {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d}
              </button>
            ))}
          </div>

          <hr className="border-white/10" />

          <div className="flex flex-col gap-2">
            <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Agent Actions</p>
            <button
              disabled={!envState || loading || done}
              onClick={() => {
                if (!envState) return;
                const priorities = ['critical','high','medium','low'];
                const executor = envState.satellites.find(s => s.active && s.role === 'executor' && s.battery > 5);
                const task = [...envState.tasks].filter(t => !t.completed && !t.assigned_to)
                  .sort((a,b) => priorities.indexOf(a.priority) - priorities.indexOf(b.priority))[0];
                if (executor && task) sendAction({ type: 'assign_task', satellite_id: executor.id, task_id: task.id });
              }}
              className="px-4 py-3 rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue text-sm font-bold uppercase tracking-wider hover:bg-neon-blue/20 transition-all disabled:opacity-40">
              ⚡ Assign Best Task
            </button>

            <button
              disabled={!envState || loading || done}
              onClick={() => sendAction({ type: 'skip' })}
              className="px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white/60 text-sm font-bold uppercase tracking-wider hover:bg-white/10 transition-all disabled:opacity-40">
              ⏭ Skip Step
            </button>

            <button
              disabled={!envState || loading}
              onClick={fetchGrade}
              className="px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm font-bold uppercase tracking-wider hover:bg-yellow-500/20 transition-all disabled:opacity-40">
              📊 Grade Now
            </button>
          </div>

          <hr className="border-white/10" />

          {/* Judge Tools */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Judge Tools</p>
            <button onClick={fetchLeaderboard} disabled={loading}
              className="px-4 py-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 text-sm font-bold uppercase tracking-wider hover:bg-purple-500/20 transition-all disabled:opacity-40">
              🏆 Baseline Leaderboard
            </button>
            <button onClick={fetchValidation} disabled={loading}
              className="px-4 py-2.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-bold uppercase tracking-wider hover:bg-green-500/20 transition-all disabled:opacity-40">
              ✓ Validate OpenEnv
            </button>
          </div>

          <hr className="border-white/10" />

          <div className="p-4 bg-black/40 border border-white/10 rounded-xl">
            <p className="text-xs text-white/40 font-mono uppercase tracking-widest mb-1">Last Event</p>
            <p className="text-sm text-neon-blue font-mono break-words">{lastEvent}</p>
          </div>

          {grade && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-xs text-green-400/70 font-mono uppercase tracking-widest mb-1">Score</p>
              <p className="text-3xl font-black text-green-400">{(grade.score * 100).toFixed(1)}%</p>
              {Object.entries(grade.breakdown).slice(0,4).map(([k,v]) => (
                <p key={k} className="text-xs font-mono text-white/50 mt-1">{k}: {typeof v === 'number' ? (v as number).toFixed(3) : String(v)}</p>
              ))}
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <p className="text-xs text-purple-400/70 font-mono uppercase tracking-widest mb-2">🏆 Baseline Leaderboard</p>
              {leaderboard.map((row: any) => (
                <div key={row.difficulty} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-xs font-bold text-white/70 uppercase">{row.difficulty}</span>
                  <span className="text-xs font-mono text-white/40">{row.tasks_completed}/{row.total_tasks} tasks</span>
                  <span className={`text-sm font-black ${row.score>0.7?'text-green-400':row.score>0.4?'text-yellow-400':'text-red-400'}`}>{(row.score*100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}

          {validation && (
            <div className={`p-4 rounded-xl border ${validation.validation_status==='PASS'?'bg-green-500/10 border-green-500/30':'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-xs font-mono uppercase tracking-widest mb-1 text-white/50">OpenEnv Compliance</p>
              <p className={`text-lg font-black ${validation.validation_status==='PASS'?'text-green-400':'text-red-400'}`}>
                {validation.validation_status==='PASS'?'✓ COMPLIANT':'✗ FAILED'}
              </p>
              {Object.entries(validation.checks||{}).map(([diff,check]:any) => (
                <div key={diff} className="mt-1 text-xs font-mono text-white/40">
                  {diff}: Det={check.deterministic?'✓':'✗'} In-range={check.score_in_range?'✓':'✗'}
                </div>
              ))}
            </div>
          )}

          {done && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center">
              <p className="text-sm font-bold text-purple-400 uppercase tracking-wider">🏁 Episode Complete!</p>
              <p className="text-xs text-white/50 font-mono mt-1">Start new session to play again</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LeafletMap Component ─────────────────────────────────────────────────────
interface LeafletMapProps {
  satellites: Array<{ id: string; battery: number; position: [number, number]; role: string; active: boolean; tasks_completed: number; storage_used: number; altitude_km?: number; velocity_kmh?: number }>;
  disasters: Array<{ id: string; title: string; category: string; lat: number; lon: number; weather_type: string }>;
  disasterMode: boolean; // keep for legacy toggle simulator
}

// Fixed sector geo-coords [lat, lng] for named sectors
const SECTOR_COORDS: Record<string, [number, number]> = {
  ALPHA: [51.5,  -0.1],    // London area
  BETA:  [40.7,  -74.0],   // New York
  GAMMA: [35.7,  139.7],   // Tokyo
  DELTA: [-33.9, 151.2],   // Sydney
  SIGMA: [-23.5, -46.6],   // São Paulo
  THETA: [28.6,  77.2],    // New Delhi
};

function LeafletMap({ satellites, disasters, disasterMode }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const satLayerRef = useRef<L.LayerGroup | null>(null);
  const disasterLayerRef = useRef<L.LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 6,
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Add named sector markers
    Object.entries(SECTOR_COORDS).forEach(([name, latlng]) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background: rgba(0,8,24,0.75);
          border: 1px solid rgba(0,240,255,0.4);
          border-radius: 8px;
          padding: 4px 8px;
          color: #00f0ff;
          font-size: 10px;
          font-weight: 900;
          font-family: monospace;
          letter-spacing: 0.15em;
          white-space: nowrap;
          box-shadow: 0 0 10px rgba(0,240,255,0.2);
        ">◉ SECTOR ${name}</div>`,
        iconAnchor: [50, 12],
      });
      L.marker(latlng, { icon }).addTo(map);
    });

    satLayerRef.current = L.layerGroup().addTo(map);
    disasterLayerRef.current = L.layerGroup().addTo(map);
    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update satellite markers
  useEffect(() => {
    const layer = satLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    satellites.filter(s => s.active).forEach(sat => {
      const [lon, lat] = sat.position;
      const batteryColor = sat.battery < 20 ? '#ff4444' : sat.role === 'planner' ? '#a855f7' : '#00f0ff';
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: 14px; height: 14px;
          border-radius: 50%;
          background: ${batteryColor};
          border: 2px solid white;
          box-shadow: 0 0 10px ${batteryColor}, 0 0 20px ${batteryColor}80;
          animation: pulse 2s infinite;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([lat, lon], { icon });
      marker.bindPopup(`
        <div style="color:#fff; font-family:monospace; font-size:12px; min-width:160px;">
          <div style="color:#00f0ff; font-weight:900; font-size:13px; margin-bottom:6px;">🛰 ${sat.id}</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#ffffff80;">Role</span>
            <span style="color:${sat.role === 'planner' ? '#a855f7' : '#00f0ff'}; font-weight:700; text-transform:uppercase;">${sat.role}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#ffffff80;">Battery</span>
            <span style="color:${sat.battery < 20 ? '#ff4444' : '#4ade80'}; font-weight:700;">${sat.battery.toFixed(1)}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#ffffff80;">Storage</span>
            <span style="color:${sat.storage_used > 80 ? '#ff4444' : '#ffffff'}; font-weight:700;">${sat.storage_used.toFixed(1)}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#ffffff80;">Tasks Done</span>
            <span style="color:#fbbf24; font-weight:700;">${sat.tasks_completed}</span>
          </div>
          <div style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.1); color:#ffffff40; font-size:10px;">
            ${lat.toFixed(2)}°, ${lon.toFixed(2)}°
          </div>
        </div>
      `, { className: 'leaflet-popup-dark' });

      marker.addTo(layer);
    });
  }, [satellites]);

  // Update disaster layer
  useEffect(() => {
    const layer = disasterLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    // Plot all real disasters from NASA
    disasters.forEach(d => {
      const sosIcon = L.divIcon({
        className: '',
        html: `<div style="
          background: #7f1d1d;
          border: 2px solid #ef4444;
          border-radius: 50%;
          width: 52px; height: 52px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          box-shadow: 0 0 40px rgba(255,0,0,0.7), 0 0 80px rgba(255,0,0,0.3);
          animation: pulse 2s infinite;
        ">
          <div style="color:#fca5a5;font-size:16px;">⚠</div>
          <div style="color:#fca5a5;font-size:9px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;">${d.category.substring(0,4)}</div>
        </div>`,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });

      L.marker([d.lat, d.lon], { icon: sosIcon })
        .bindPopup(`<div style="color:#ef4444;font-family:monospace;font-weight:900;font-size:13px;max-width:200px;white-space:normal;">🚨 ${d.title}<br/><span style="color:#ffffff80;font-size:11px;font-weight:normal;">NASA EONET Real-Time Event</span></div>`, { className: 'leaflet-popup-dark' })
        .addTo(layer);
        
      // Pulsing rings for disasters
      L.circle([d.lat, d.lon], { radius: 400000, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.04, weight: 2, opacity: 0.6 }).addTo(layer);
    });

  }, [disasters, disasterMode]);


  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
  );
}

// ─── Real-World Data Hook ─────────────────────────────────────────────────────
interface LiveSatellite {
  id: string; position: [number,number]; role: string; battery: number;
  storage_used: number; active: boolean; tasks_completed: number;
  altitude_km?: number; velocity_kmh?: number;
}
interface LiveDisaster {
  id: string; title: string; category: string; weather_type: string;
  lon: number; lat: number; date: string; link: string;
}
interface LiveWeather {
  condition: string; label: string; kp_index: number|null; source: string; timestamp: string;
}

function useRealData() {
  const [satellites, setSatellites] = useState<LiveSatellite[]>([]);
  const [disasters,  setDisasters]  = useState<LiveDisaster[]>([]);
  const [weather,    setWeather]    = useState<LiveWeather | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [lastFetch,  setLastFetch]  = useState<string>('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/live/all`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const d = await r.json();
        setSatellites(d.satellites ?? []);
        setDisasters(d.disasters ?? []);
        setWeather(d.weather ?? null);
        setLastFetch(new Date().toLocaleTimeString());
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30000); // refresh every 30s
    return () => clearInterval(t);
  }, [fetchAll]);

  return { satellites, disasters, weather, loading, lastFetch, refetch: fetchAll };
}

// ─── Main Component ───────────────────────────────────────────────────────────
// Random sector positions for simulated disaster
const SECTOR_POSITIONS = [
  { name: 'ALPHA', x: 15, y: 30 },
  { name: 'BETA', x: 38, y: 22 },
  { name: 'GAMMA', x: 62, y: 35 },
  { name: 'DELTA', x: 82, y: 28 },
  { name: 'SIGMA', x: 28, y: 65 },
  { name: 'THETA', x: 70, y: 68 },
];

export function GlobalDashboard({ onClose }: { onClose: () => void }) {
  const [activePortal, setActivePortal] = useState<string | null>(null);
  const [chaosEvent, setChaosEvent] = useState<string | null>(null);
  const [disasterMode, setDisasterMode] = useState(false);
  const [simulatedSector, setSimulatedSector] = useState<{ name: string; x: number; y: number } | null>(null);

  const backend = useBackend();
  const realData = useRealData();

  // Auto-reset disaster simulation when leaving portal
  useEffect(() => {
    if (activePortal !== 'attention') {
      setDisasterMode(false);
      setSimulatedSector(null);
    }
  }, [activePortal]);

  const toggleDisaster = () => {
    if (disasterMode) {
      setDisasterMode(false);
      setSimulatedSector(null);
    } else {
      // Pick a random sector different from last one
      const randomSector = SECTOR_POSITIONS[Math.floor(Math.random() * SECTOR_POSITIONS.length)];
      setSimulatedSector(randomSector);
      setDisasterMode(true);
    }
  };

  const getBestPath = () => {
    if (backend.envState?.disaster_active || disasterMode) return 'A';
    if ((backend.envState?.satellites.reduce((a, s) => a + s.battery, 0) ?? 400) / (backend.envState?.satellites.length ?? 5) < 40) return 'B';
    return 'C';
  };

  const portals = [
    { id: 'cognitive', title: 'Portal 1: Cognitive Load Balancing', desc: 'Not all satellites process information equally — role-based planner/executor architecture.', icon: Cpu },
    { id: 'chaos', title: 'Portal 2: Chaos Testing Mode', desc: 'Simulate solar flares, cascade failures, and task overloads to test system resilience.', icon: AlertOctagon },
    { id: 'dreams', title: 'Portal 3: Satellite Dreams', desc: 'Multi-path future simulation — the AI picks the optimal course of action in real-time.', icon: Target },
    { id: 'attention', title: 'Portal 4: Global Attention & Disaster', desc: 'Disaster zone detection that forces the entire fleet to reprioritize instantly.', icon: Globe },
    { id: 'scheduling', title: 'Portal 5: Live RL Environment', desc: 'Real backend-powered RL environment — schedule tasks, manage satellites, earn rewards.', icon: HardDrive },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className={`absolute inset-0 z-50 p-6 flex flex-col transition-colors duration-700 ${chaosEvent ? 'bg-red-950/90' : 'bg-[#030612]/95'} backdrop-blur-3xl overflow-hidden`}
      >
        {chaosEvent && <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(255,0,0,0.4)] animate-pulse" />}

        {/* Header */}
        <header className="flex justify-between items-center mb-6 relative z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Network className={`w-8 h-8 ${chaosEvent ? 'text-red-500' : 'text-neon-blue'}`} />
            <div>
              <h1 className={`text-4xl md:text-5xl font-black tracking-widest uppercase ${chaosEvent ? 'text-red-500' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-blue'}`}>
                Antariksh
              </h1>
              <p className={`text-[10px] tracking-[0.3em] font-mono uppercase ${chaosEvent ? 'text-red-400' : 'text-blue-300'}`}>Orbital Intelligence System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusDot online={backend.online} />
            {activePortal && (
              <button onClick={() => setActivePortal(null)} className="px-4 py-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white rounded font-bold tracking-wider text-xs uppercase flex items-center gap-2 transition-all">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 rounded-full transition-all group">
              <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 relative z-10 flex flex-col min-h-0">
          {!activePortal ? (
            <div className="flex flex-col gap-4 h-full">
              {/* Top Row — 3 boxes */}
              <div className="flex gap-4 flex-1">
                {portals.slice(0, 3).map(portal => (
                  <button key={portal.id} onClick={() => setActivePortal(portal.id)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-8 flex flex-col justify-between hover:border-neon-blue/50 hover:bg-neon-blue/10 transition-all text-left group">
                    <div className="w-16 h-16 rounded-full bg-neon-blue/20 flex items-center justify-center border border-neon-blue/40 group-hover:scale-110 transition-transform">
                      <portal.icon className="w-8 h-8 text-neon-blue" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center py-6">
                      <h2 className="text-xl font-black tracking-widest text-white uppercase leading-tight">{portal.title}</h2>
                      <p className="text-base text-white/50 mt-3 font-mono leading-relaxed">{portal.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 text-neon-blue/60 group-hover:text-neon-blue transition-colors">
                      <span className="text-sm font-bold tracking-[0.2em] uppercase font-mono">Enter Portal</span>
                      <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>
                ))}
              </div>
              {/* Bottom Row — 2 boxes */}
              <div className="flex gap-4 flex-1">
                {portals.slice(3).map(portal => (
                  <button key={portal.id} onClick={() => setActivePortal(portal.id)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-8 flex flex-col justify-between hover:border-neon-blue/50 hover:bg-neon-blue/10 transition-all text-left group">
                    <div className="w-16 h-16 rounded-full bg-neon-blue/20 flex items-center justify-center border border-neon-blue/40 group-hover:scale-110 transition-transform">
                      <portal.icon className="w-8 h-8 text-neon-blue" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center py-6">
                      <h2 className="text-xl font-black tracking-widest text-white uppercase leading-tight">{portal.title}</h2>
                      <p className="text-base text-white/50 mt-3 font-mono leading-relaxed">{portal.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 text-neon-blue/60 group-hover:text-neon-blue transition-colors">
                      <span className="text-sm font-bold tracking-[0.2em] uppercase font-mono">Enter Portal</span>
                      <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-full">

              {/* ── PORTAL 1: Cognitive Load Balancing ── */}
              {activePortal === 'cognitive' && (
                <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-8 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                    <Cpu className="text-purple-400 w-8 h-8" />
                    <div>
                      <h2 className="text-xl font-black tracking-widest text-purple-400 uppercase">Cognitive Load Balancing</h2>
                      <p className="text-sm text-white/50 font-mono">Role Assignment Configuration</p>
                    </div>
                  </div>
                  {backend.envState ? (
                    <div className="flex-1 flex flex-col gap-4 min-h-0">
                      {/* Live role split */}
                      <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                        {(['planner','executor'] as const).map(role => {
                          const sats = backend.envState!.satellites.filter(s => s.role === role);
                          return (
                            <div key={role} className={`p-5 rounded-xl border ${role === 'planner' ? 'border-purple-500/30 bg-purple-900/20' : 'border-neon-blue/30 bg-neon-blue/10'}`}>
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-white uppercase tracking-wider">{role} Constellation</span>
                                <span className={`text-xs px-2 py-1 rounded font-mono ${role === 'planner' ? 'bg-purple-500/20 text-purple-300' : 'bg-neon-blue/20 text-blue-300'}`}>{sats.length} Nodes</span>
                              </div>
                              <div className="h-2 w-full bg-black rounded-full overflow-hidden">
                                <div className={`h-full ${role === 'planner' ? 'bg-purple-500' : 'bg-neon-blue'}`} style={{ width: `${(sats.length / backend.envState!.satellites.length) * 100}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Satellite grid — fills remaining space */}
                      <h3 className="text-xs font-black tracking-widest text-white/50 uppercase flex-shrink-0">Live Fleet — Click to Change Role</h3>
                      <div className="flex-1 grid grid-cols-2 auto-rows-fr gap-3 min-h-0">
                        {backend.envState.satellites.map(sat => (
                          <button key={sat.id} onClick={() => backend.sendAction({ type: 'change_role', satellite_id: sat.id })}
                            disabled={!sat.active || backend.loading}
                            className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.01] disabled:opacity-50 flex flex-col justify-between ${sat.role === 'planner' ? 'border-purple-500/30 bg-purple-900/10 hover:bg-purple-900/20' : 'border-neon-blue/30 bg-neon-blue/5 hover:bg-neon-blue/10'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-white font-mono">{sat.id}</span>
                              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${sat.role === 'planner' ? 'bg-purple-500/20 text-purple-300' : 'bg-neon-blue/20 text-neon-blue'}`}>{sat.role}</span>
                            </div>
                            <div className="mt-2 space-y-1.5">
                              <div className="flex justify-between text-xs text-white/50 font-mono"><span>🔋 Battery</span><span>{sat.battery.toFixed(0)}%</span></div>
                              <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden"><div className={`h-full rounded-full ${sat.battery < 20 ? 'bg-red-500' : 'bg-neon-blue'}`} style={{ width: `${sat.battery}%` }} /></div>
                              <div className="text-xs text-white/40 font-mono">{sat.active ? '● Online' : '✗ Offline'} · Tasks: {sat.tasks_completed}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/40">
                      <Cpu className="w-16 h-16 opacity-20" />
                      <p className="font-mono text-sm">Go to Portal 5 to start an RL session first</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── PORTAL 2: Chaos Testing ── */}
              {activePortal === 'chaos' && (
                <div className="w-full border border-red-500/30 rounded-2xl flex flex-col overflow-hidden h-full bg-black/40">

                  {/* Header */}
                  <div className="flex-shrink-0 flex justify-between items-center px-8 py-5 border-b border-red-500/20 bg-red-950/10">
                    <div className="flex items-center gap-4">
                      <AlertOctagon className="text-red-500 w-9 h-9 animate-pulse" />
                      <div>
                        <h2 className="text-2xl font-black tracking-widest text-red-400 uppercase">Chaos Testing Mode</h2>
                        <p className="text-sm text-red-500/50 font-mono mt-0.5">Simulate System Disruptions · Test Fleet Resilience</p>
                      </div>
                    </div>
                    {chaosEvent && (
                      <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                        className="flex items-center gap-3 bg-red-500/20 border border-red-500/50 px-5 py-2.5 rounded-xl">
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                        <span className="text-red-300 font-black text-sm tracking-widest uppercase">CHAOS ENGAGED</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Fleet health stats bar */}
                  <div className="flex-shrink-0 grid grid-cols-4 divide-x divide-red-500/10 border-b border-red-500/10 bg-black/30">
                    {[
                      {
                        label: 'Avg Battery',
                        value: backend.envState
                          ? (backend.envState.satellites.reduce((a, s) => a + s.battery, 0) / backend.envState.satellites.length).toFixed(0) + '%'
                          : '—',
                        color: 'text-orange-400',
                        warn: backend.envState
                          ? backend.envState.satellites.reduce((a, s) => a + s.battery, 0) / backend.envState.satellites.length < 40
                          : false,
                      },
                      {
                        label: 'Online Satellites',
                        value: backend.envState ? backend.envState.satellites.filter(s => s.active).length + '/' + backend.envState.satellites.length : '—',
                        color: 'text-neon-blue',
                        warn: false,
                      },
                      {
                        label: 'Weather Condition',
                        value: backend.envState?.weather?.replace('_', ' ').toUpperCase() ?? 'CLEAR',
                        color: backend.envState?.weather === 'solar_flare' ? 'text-red-400' : backend.envState?.weather === 'storm' ? 'text-yellow-400' : 'text-green-400',
                        warn: backend.envState?.weather === 'solar_flare',
                      },
                      {
                        label: 'Chaos Event',
                        value: chaosEvent ?? 'NONE',
                        color: chaosEvent ? 'text-red-400' : 'text-white/30',
                        warn: !!chaosEvent,
                      },
                    ].map(({ label, value, color, warn }) => (
                      <div key={label} className="flex flex-col items-center justify-center py-4 px-3 gap-1">
                        <span className={`text-2xl font-black ${warn ? 'text-red-400 animate-pulse' : color}`}>{value}</span>
                        <span className="text-xs text-white/30 font-mono uppercase tracking-widest">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Chaos event cards — 3 equal rows filling height */}
                  <div className="flex-1 flex flex-col divide-y divide-red-500/10 min-h-0">
                    {[
                      {
                        key: 'STORM',
                        icon: '☀️',
                        label: 'Solar Storm Event',
                        subtitle: 'ELECTROMAGNETIC DISRUPTION',
                        desc: 'A class-X solar flare hits the fleet. Battery drain ×7.5 per step forces energy conservation mode. Affects all satellites simultaneously.',
                        impact: [
                          { label: 'Battery Drain Rate', value: '×7.5', severity: 'critical' },
                          { label: 'Satellites Affected', value: '100%', severity: 'high' },
                          { label: 'Comms Disruption', value: 'YES', severity: 'critical' },
                          { label: 'Recovery Time', value: '8 steps', severity: 'medium' },
                        ],
                        effect: 'Planner nodes enter standby. Executor bandwidth drops to 30%.',
                      },
                      {
                        key: 'SYSTEM_FAIL',
                        icon: '🔴',
                        label: 'Cascade System Failure',
                        subtitle: 'MESH NETWORK COLLAPSE',
                        desc: 'Satellites with battery <20% go offline instantly. Tests the fleet\'s self-healing mesh redundancy and automatic role redistribution.',
                        impact: [
                          { label: 'Nodes at Risk', value: backend.envState ? backend.envState.satellites.filter(s => s.battery < 20).length + ' sats' : '? sats', severity: 'critical' },
                          { label: 'Role Redundancy', value: 'TESTED', severity: 'medium' },
                          { label: 'Coverage Loss', value: '-45%', severity: 'high' },
                          { label: 'Failover Speed', value: '2 steps', severity: 'low' },
                        ],
                        effect: 'Remaining active satellites inherit orphaned tasks automatically.',
                      },
                      {
                        key: 'OVERLOAD',
                        icon: '⚡',
                        label: 'Task Overload Attack',
                        subtitle: 'DATA FLOOD SCENARIO',
                        desc: 'Storage fills ×5 faster than normal. All planner nodes overwhelmed with incoming sensor requests. Tests queue management and prioritization.',
                        impact: [
                          { label: 'Storage Fill Rate', value: '×5', severity: 'critical' },
                          { label: 'Planner Load', value: '100%', severity: 'critical' },
                          { label: 'Task Drop Rate', value: '+60%', severity: 'high' },
                          { label: 'Priority Queue', value: 'ACTIVE', severity: 'low' },
                        ],
                        effect: 'Only CRITICAL and HIGH priority tasks survive the queue flood.',
                      },
                    ].map(({ key, icon, label, subtitle, desc, impact, effect }) => {
                      const isActive = chaosEvent === key;
                      return (
                        <div key={key}
                          className={`flex-1 p-6 flex gap-6 transition-all duration-300 cursor-pointer ${isActive ? 'bg-red-950/30 border-l-4 border-l-red-500' : 'hover:bg-red-950/10'}`}
                          onClick={() => setChaosEvent(isActive ? null : key)}>

                          {/* Left: icon + title */}
                          <div className="flex flex-col justify-between w-56 flex-shrink-0">
                            <div>
                              <div className={`text-5xl mb-3 ${isActive ? 'animate-bounce' : ''}`}>{icon}</div>
                              <div className={`text-xs font-bold tracking-widest font-mono mb-1 ${isActive ? 'text-red-400' : 'text-white/30'}`}>{subtitle}</div>
                              <h3 className={`text-lg font-black uppercase tracking-wide leading-tight ${isActive ? 'text-red-300' : 'text-white/80'}`}>{label}</h3>
                              <p className="text-xs text-white/40 font-mono mt-2 leading-relaxed">{desc}</p>
                            </div>
                            <div className="mt-3">
                              <button className={`w-full py-2.5 px-4 rounded-xl font-black text-sm tracking-widest uppercase border transition-all ${isActive ? 'bg-red-500 text-white border-red-400 shadow-[0_0_20px_rgba(255,0,0,0.5)] animate-pulse' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'}`}>
                                {isActive ? '⛔ DISENGAGE' : '⚡ ACTIVATE'}
                              </button>
                            </div>
                          </div>

                          {/* Right: impact metrics */}
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            {impact.map(m => {
                              const severityColor = m.severity === 'critical' ? 'text-red-400 border-red-500/30 bg-red-950/30' :
                                m.severity === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-950/20' :
                                m.severity === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20' :
                                'text-green-400 border-green-500/30 bg-green-950/20';
                              return (
                                <div key={m.label} className={`rounded-xl border p-3 flex flex-col gap-1 ${isActive ? severityColor : 'border-white/5 bg-black/30'}`}>
                                  <span className="text-xs text-white/40 font-mono uppercase tracking-widest">{m.label}</span>
                                  <span className={`text-2xl font-black ${isActive ? '' : 'text-white/50'}`}>{m.value}</span>
                                  <div className={`text-xs uppercase font-bold tracking-wider ${isActive ? '' : 'text-white/20'}`}>{m.severity}</div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Effect pill */}
                          {isActive && (
                            <div className="flex-shrink-0 w-48 flex items-center">
                              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs text-red-300 font-mono leading-relaxed">
                                <div className="text-red-400 font-black uppercase tracking-widest mb-2">Side Effect</div>
                                {effect}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom system log */}
                  <div className="flex-shrink-0 flex items-center gap-4 px-8 py-3 border-t border-red-500/10 bg-black/40">
                    <span className="text-xs text-white/20 font-mono uppercase tracking-widest flex-shrink-0">SYS LOG:</span>
                    <span className={`text-xs font-mono ${chaosEvent ? 'text-red-400' : 'text-neon-blue/60'}`}>
                      {chaosEvent === 'STORM'
                        ? '⚡ SOLAR FLARE DETECTED — Battery drain protocol engaged. Fleet entering conservation mode.'
                        : chaosEvent === 'SYSTEM_FAIL'
                        ? '🔴 CASCADE FAILURE INITIATED — Mesh self-healing active. Redistributing orphaned tasks.'
                        : chaosEvent === 'OVERLOAD'
                        ? '⚠ TASK FLOOD ACTIVE — Queue overflow detected. Priority filter dropping LOW tasks.'
                        : '✓ All systems nominal. No chaos events active. Click a scenario to test resilience.'}
                    </span>
                    <span className="ml-auto text-xs text-white/15 font-mono flex-shrink-0">T+{Date.now().toString().slice(-6)}</span>
                  </div>
                </div>
              )}


              {/* ── PORTAL 3: Satellite Dreams ── */}
              {activePortal === 'dreams' && (
                <div className="w-full bg-black/40 border border-white/10 rounded-2xl flex flex-col overflow-hidden h-full">
                  {/* Header */}
                  <div className="flex-shrink-0 flex justify-between items-center px-8 py-5 border-b border-white/10 bg-gradient-to-r from-neon-blue/5 to-purple-500/5">
                    <div>
                      <h2 className="text-2xl font-black tracking-widest text-neon-blue uppercase">Satellite Dreams: Future Simulation Engine</h2>
                      <p className="text-sm text-white/50 font-mono mt-1">The AI runs 3 parallel futures and selects the optimal trajectory — powered by live RL state.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-neon-blue/10 px-5 py-2.5 border border-neon-blue/30 rounded-xl">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-neon-blue"></span>
                      </span>
                      <span className="text-sm tracking-widest font-mono text-neon-blue uppercase font-bold">LIVE NEURAL SIM</span>
                    </div>
                  </div>

                  {/* 3 Path Cards — fill remaining height */}
                  <div className="flex-1 grid grid-cols-3 divide-x divide-white/10 min-h-0">
                    {[
                      {
                        path: 'A', letter: 'A', color: 'green', gradFrom: 'from-green-500/10',
                        label: 'Maximum Data Harvest', subtitle: 'AGGRESSIVE MODE',
                        desc: 'Deploys all executors simultaneously. Max sensor engagement and high-res Earth imagery. Chosen when disaster response is the priority.',
                        yield: '98%', yieldLabel: 'OPTIMAL', battery: '-40%', batteryLabel: 'CRITICAL',
                        tasks: '10/10', coverage: '100%', probability: 92,
                        condition: 'A',
                        metrics: [
                          { label: 'Data Yield', value: '98%', good: true },
                          { label: 'Battery Impact', value: '-40%', good: false },
                          { label: 'Storage Used', value: '95%', good: false },
                          { label: 'Disaster Resp.', value: '100%', good: true },
                        ]
                      },
                      {
                        path: 'B', letter: 'B', color: 'yellow', gradFrom: 'from-yellow-500/10',
                        label: 'Deep Hibernation', subtitle: 'CONSERVATION MODE',
                        desc: 'Halts all non-essential scanning. Satellites enter low-power state and focus resources on solar charging and battery recovery.',
                        yield: '12%', yieldLabel: 'MINIMAL', battery: '+10%', batteryLabel: 'SAFE',
                        tasks: '2/10', coverage: '20%', probability: 8,
                        condition: 'B',
                        metrics: [
                          { label: 'Data Yield', value: '12%', good: false },
                          { label: 'Battery Impact', value: '+10%', good: true },
                          { label: 'Storage Used', value: '15%', good: true },
                          { label: 'Disaster Resp.', value: '10%', good: false },
                        ]
                      },
                      {
                        path: 'C', letter: 'C', color: 'blue', gradFrom: 'from-blue-500/10',
                        label: 'Balanced Nomad', subtitle: 'ADAPTIVE MODE',
                        desc: 'Standard predictive scheduling. Maintains data collection while preserving resources. Optimal balance for routine operations.',
                        yield: '65%', yieldLabel: 'ADEQUATE', battery: '-12%', batteryLabel: 'NOMINAL',
                        tasks: '6/10', coverage: '65%', probability: 65,
                        condition: 'C',
                        metrics: [
                          { label: 'Data Yield', value: '65%', good: true },
                          { label: 'Battery Impact', value: '-12%', good: true },
                          { label: 'Storage Used', value: '55%', good: true },
                          { label: 'Disaster Resp.', value: '60%', good: true },
                        ]
                      },
                    ].map(({ path, letter, color, gradFrom, label, subtitle, desc, yield: yld, yieldLabel, battery: bat, batteryLabel, probability, condition, metrics }) => {
                      const best = getBestPath();
                      const isSelected = best === condition;
                      const colorMap: Record<string, string> = {
                        green: 'text-green-400 border-green-500 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.3)]',
                        yellow: 'text-yellow-400 border-yellow-500 bg-yellow-500/10 shadow-[0_0_30px_rgba(234,179,8,0.3)]',
                        blue: 'text-blue-400 border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.3)]',
                      };
                      const badgeColor: Record<string, string> = {
                        green: 'bg-green-500 text-black',
                        yellow: 'bg-yellow-500 text-black',
                        blue: 'bg-blue-500 text-white',
                      };
                      const barColor: Record<string, string> = {
                        green: 'bg-green-500',
                        yellow: 'bg-yellow-500',
                        blue: 'bg-blue-400',
                      };
                      return (
                        <div key={path} className={`flex flex-col relative p-6 gap-5 transition-all duration-500 bg-gradient-to-b ${isSelected ? gradFrom : ''}`}>
                          {/* Selected top bar */}
                          {isSelected && <div className={`absolute top-0 inset-x-0 h-1 ${barColor[color]} shadow-[0_0_20px_currentColor]`} />}

                          {/* Path header */}
                          <div className="flex items-start justify-between">
                            <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black ${isSelected ? colorMap[color] : 'border-white/10 text-white/30 bg-white/5'} transition-all`}>
                              {letter}
                            </div>
                            <div className="text-right">
                              <div className={`text-xs font-bold tracking-widest font-mono ${isSelected ? (color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : 'text-blue-400') : 'text-white/30'}`}>{subtitle}</div>
                              {isSelected && (
                                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                                  className={`mt-2 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${badgeColor[color]}`}>
                                  ✓ SELECTED
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Path title */}
                          <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-wide leading-tight">Path {path}: {label}</h3>
                            <p className="text-xs text-white/50 font-mono mt-2 leading-relaxed">{desc}</p>
                          </div>

                          {/* Probability bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono text-white/50">
                              <span>AI SELECTION PROBABILITY</span>
                              <span className={isSelected ? (color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : 'text-blue-400') : 'text-white/40'}>{probability}%</span>
                            </div>
                            <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${probability}%` }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                className={`h-full rounded-full ${barColor[color]}`}
                              />
                            </div>
                          </div>

                          {/* Key metrics grid */}
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            {metrics.map(m => (
                              <div key={m.label} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                                <span className="text-xs text-white/40 font-mono uppercase tracking-widest">{m.label}</span>
                                <span className={`text-xl font-black ${m.good ? (color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : 'text-blue-400') : 'text-red-400'}`}>{m.value}</span>
                              </div>
                            ))}
                          </div>

                          {/* Main KPIs */}
                          <div className={`p-4 rounded-xl border ${isSelected ? `border-${color === 'green' ? 'green' : color === 'yellow' ? 'yellow' : 'blue'}-500/30 bg-${color === 'green' ? 'green' : color === 'yellow' ? 'yellow' : 'blue'}-500/5` : 'border-white/5 bg-black/20'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/60 font-mono">Data Yield</span>
                              <span className={`text-2xl font-black ${color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : 'text-blue-400'}`}>{yld} <span className="text-sm font-bold">{yieldLabel}</span></span>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-sm text-white/60 font-mono">Battery Impact</span>
                              <span className={`text-xl font-black ${bat.startsWith('+') ? 'text-green-400' : bat === '-12%' ? 'text-blue-400' : 'text-red-400'}`}>{bat} <span className="text-sm font-bold">{batteryLabel}</span></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom AI decision log */}
                  <div className="flex-shrink-0 flex items-center gap-6 px-8 py-3 border-t border-white/10 bg-black/40">
                    <span className="text-xs text-white/30 font-mono uppercase tracking-widest flex-shrink-0">AI ENGINE LOG:</span>
                    <span className="text-xs text-neon-blue font-mono">
                      {getBestPath() === 'A'
                        ? '⚡ Disaster response active — ENGINE selected MAX DATA PATH for emergency coverage'
                        : getBestPath() === 'B'
                        ? '🔋 Battery critical — ENGINE selected HIBERNATION PATH to preserve satellite fleet'
                        : '✓ Fleet nominal — ENGINE selected BALANCED PATH for optimal resource efficiency'}
                    </span>
                    <span className="ml-auto text-xs text-white/20 font-mono flex-shrink-0">SIM CYCLE #{Math.floor(Date.now() / 5000) % 9999}</span>
                  </div>
                </div>
              )}


              {/* ── PORTAL 4: Global Attention ── */}
              {activePortal === 'attention' && (
                <div className={`w-full h-full rounded-2xl border flex flex-col overflow-hidden transition-all duration-700 ${(disasterMode || backend.envState?.disaster_active) ? 'border-red-500/60 bg-red-950/20 shadow-[0_0_60px_rgba(255,0,0,0.15)]' : 'border-white/10 bg-black/40'}`}>

                  {/* Header */}
                  <div className="flex-shrink-0 flex justify-between items-center px-8 py-5 border-b border-white/10 bg-black/20">
                    <div>
                      <h2 className={`text-2xl font-black tracking-widest uppercase ${(disasterMode || backend.envState?.disaster_active) ? 'text-red-400' : 'text-white'}`}>
                        Global Attention &amp; Disaster Priority
                      </h2>
                      <p className="text-sm text-white/50 font-mono mt-1">
                        {(disasterMode || backend.envState?.disaster_active)
                          ? `🚨 DISASTER ACTIVE — Redirecting all satellite bandwidth to emergency sectors`
                          : 'Planetary monitoring system · Real-time satellite tracking · OpenStreetMap'}
                      </p>
                    </div>
                    <button onClick={toggleDisaster}
                      className={`px-6 py-3 rounded-xl font-black tracking-widest text-sm uppercase transition-all border relative overflow-hidden ${disasterMode ? 'bg-red-500 text-white border-red-400 shadow-[0_0_30px_rgba(255,0,0,0.6)] scale-105' : 'bg-white/5 text-white border-white/20 hover:bg-white/10'}`}>
                      {disasterMode && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                      <span className="relative z-10">{disasterMode ? '⛔ ABORT PROTOCOL' : '🚨 SIMULATE DISASTER'}</span>
                    </button>
                  </div>

                  {/* Stats bar */}
                  <div className="flex-shrink-0 grid grid-cols-4 divide-x divide-white/10 border-b border-white/10 bg-black/30">
                    {[
                      { label: 'Active Satellites', value: realData.satellites.length || '—', color: 'text-neon-blue' },
                      { label: 'Real Disasters', value: realData.disasters.length || '—', color: realData.disasters.length ? 'text-red-400' : 'text-green-400' },
                      { label: 'Disaster Status', value: realData.disasters.length ? 'ACTIVE' : 'CLEAR', color: realData.disasters.length ? 'text-red-400' : 'text-green-400' },
                      { label: 'Space Weather', value: realData.weather?.label || 'LOADING...', color: 'text-purple-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex flex-col items-center justify-center py-4 px-2 gap-1">
                        <span className={`text-2xl font-black ${color} text-center`}>{value}</span>
                        <span className="text-xs text-white/40 font-mono uppercase tracking-widest text-center">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Real Leaflet World Map */}
                  <div className="flex-1 relative overflow-hidden">
                    <LeafletMap
                      satellites={realData.satellites}
                      disasters={
                        disasterMode && simulatedSector
                          ? [
                              ...realData.disasters,
                              {
                                id: 'sim-disaster',
                                title: `SIMULATED DISASTER: SECTOR ${simulatedSector.name}`,
                                category: 'simulation',
                                weather_type: 'storm',
                                lat: SECTOR_COORDS[simulatedSector.name] ? SECTOR_COORDS[simulatedSector.name][0] : 0,
                                lon: SECTOR_COORDS[simulatedSector.name] ? SECTOR_COORDS[simulatedSector.name][1] : 0,
                                date: '',
                                link: ''
                              }
                            ]
                          : realData.disasters
                      }
                      disasterMode={disasterMode}
                    />
                  </div>

                  {/* Bottom ticker */}
                  <div className="flex-shrink-0 flex gap-6 px-8 py-3 border-t border-white/10 bg-black/30 overflow-x-auto scrollbar-hide">
                    {disasterMode && simulatedSector && (
                      <span key="sim-disaster" className="text-xs font-mono whitespace-nowrap font-bold tracking-widest text-red-400 animate-pulse">
                        ⚠ SIMULATED DISASTER ACTIVE — SECTOR {simulatedSector.name}
                      </span>
                    )}
                    {realData.disasters.map((d) => (
                      <span key={d.id} className="text-xs font-mono whitespace-nowrap font-bold tracking-widest text-red-400 animate-pulse">
                        ⚠ {d.title.toUpperCase()} (NASAEONET: {d.category})
                      </span>
                    ))}
                    {!disasterMode && realData.disasters.length === 0 && (
                      <span className="text-xs font-mono whitespace-nowrap font-bold tracking-widest text-neon-blue/70">
                        ✓ ALL SECTORS NOMINAL — NO ACTIVE DISASTERS REPORTED
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── PORTAL 5: Live RL Environment ── */}
              {activePortal === 'scheduling' && (
                <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <HardDrive className="text-blue-400 w-7 h-7" />
                      <div>
                        <h2 className="text-lg font-black tracking-widest text-blue-400 uppercase">Live RL Environment</h2>
                        <p className="text-xs text-white/50 font-mono">Real backend · Real agents · Real rewards</p>
                      </div>
                    </div>
                    <StatusDot online={backend.online} />
                  </div>
                  {!backend.online ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/40">
                      <WifiOff className="w-16 h-16 opacity-20" />
                      <p className="font-mono">Backend offline. Run: <code className="text-neon-blue bg-black/40 px-2 py-1 rounded">uvicorn main:app --reload --port 8000</code></p>
                    </div>
                  ) : (
                    <LiveDashboard {...backend} />
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
