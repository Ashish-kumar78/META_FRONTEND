import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Database, Server, Wifi, WifiOff, RefreshCw,
  Trophy, Activity, Cpu, HardDrive, CheckCircle2, Clock,
  BarChart2, Layers
} from 'lucide-react';

const API = import.meta.env.MODE === 'production' ? '' : 'http://localhost:8000';

interface Session {
  session_id: string;
  difficulty: string;
  step: number;
  done: boolean;
}

interface LeaderboardEntry {
  rank: number;
  agent: string;
  difficulty: string;
  score: number;
  steps: number;
  total_reward: number;
  tasks_completed: number;
  total_tasks: number;
}

interface Stats {
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;
  by_difficulty: { easy: number; medium: number; hard: number };
  environment: string;
}

interface Validation {
  validation_status: string;
  openenv_compliant: boolean;
  checks: Record<string, any>;
}

type Tab = 'overview' | 'sessions' | 'leaderboard' | 'validation';

export function DatabasePanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [online, setOnline]           = useState(false);
  const [sessions, setSessions]       = useState<Session[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [validation, setValidation]   = useState<Validation | null>(null);
  const [loadingLB, setLoadingLB]     = useState(false);
  const [loadingVal, setLoadingVal]   = useState(false);
  const [apiInfo, setApiInfo]         = useState<any>(null);

  const checkHealth = useCallback(async () => {
    try {
      const r = await fetch(`${API}/`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) {
        const d = await r.json();
        setApiInfo(d);
        setOnline(true);
      } else { setOnline(false); }
    } catch { setOnline(false); }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const r = await fetch(`${API}/sessions`);
      const d = await r.json();
      setSessions(d.sessions ?? []);
    } catch {}
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/stats`);
      const d = await r.json();
      setStats(d);
    } catch {}
  }, []);

  const fetchLeaderboard = async () => {
    setLoadingLB(true);
    try {
      const r = await fetch(`${API}/leaderboard`);
      const d = await r.json();
      setLeaderboard(d.leaderboard ?? []);
    } catch {}
    setLoadingLB(false);
  };

  const fetchValidation = async () => {
    setLoadingVal(true);
    try {
      const r = await fetch(`${API}/validate`);
      const d = await r.json();
      setValidation(d);
    } catch {}
    setLoadingVal(false);
  };

  const deleteSession = async (id: string) => {
    try {
      await fetch(`${API}/sessions/${id}`, { method: 'DELETE' });
      fetchSessions();
      fetchStats();
    } catch {}
  };

  useEffect(() => {
    checkHealth();
    const t = setInterval(checkHealth, 5000);
    return () => clearInterval(t);
  }, [checkHealth]);

  useEffect(() => {
    if (!online) return;
    fetchSessions();
    fetchStats();
    const t = setInterval(() => { fetchSessions(); fetchStats(); }, 4000);
    return () => clearInterval(t);
  }, [online]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',    label: 'Overview',    icon: <Server className="w-3.5 h-3.5" /> },
    { id: 'sessions',    label: 'Sessions',    icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-3.5 h-3.5" /> },
    { id: 'validation',  label: 'Validation',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="absolute inset-0 z-50 bg-[#030612]/96 backdrop-blur-3xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Database className="w-7 h-7 text-purple-400" />
            <div>
              <h1 className="text-3xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">
                Satellite Database
              </h1>
              <p className="text-xs tracking-[0.3em] font-mono uppercase text-purple-300/60">
                Session Registry · Performance Metrics · Environment Catalog
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold tracking-widest ${online ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-red-500/40 bg-red-500/10 text-red-400'}`}>
              {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {online ? 'DB ONLINE' : 'DB OFFLINE'}
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 rounded-full transition-all group">
              <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </header>

        {/* Tab Bar */}
        <div className="flex gap-1 px-8 pt-4 border-b border-white/10 bg-black/20 flex-shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold tracking-widest uppercase transition-all relative ${tab === t.id ? 'text-purple-400' : 'text-white/40 hover:text-white/70'}`}>
              {t.icon}{t.label}
              {tab === t.id && <motion.div layoutId="db-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]" />}
            </button>
          ))}
        </div>

        {!online ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/40">
            <WifiOff className="w-16 h-16 opacity-20" />
            <p className="font-mono text-base">Backend offline. Start the backend server first.</p>
            <code className="text-purple-400 bg-black/40 px-4 py-2 rounded text-sm">uvicorn main:app --reload --port 8000</code>
          </div>
        ) : (

          <div className="flex-1 overflow-y-auto p-8 min-h-0">

            {/* ── Tab: Overview ── */}
            {tab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {apiInfo && (
                  <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6">
                    <h2 className="text-base font-black tracking-widest uppercase text-purple-400 mb-4">API Status</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Name',    value: apiInfo.name,    color: 'text-white' },
                        { label: 'Version', value: apiInfo.version, color: 'text-purple-400' },
                        { label: 'Status',  value: apiInfo.status,  color: 'text-green-400' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/5">
                          <p className="text-xs font-mono uppercase tracking-widest text-white/40 mb-1">{label}</p>
                          <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(apiInfo.endpoints ?? []).map((ep: string) => (
                        <span key={ep} className="text-sm font-mono px-3 py-1 rounded border border-purple-500/20 bg-purple-500/5 text-purple-300">{ep}</span>
                      ))}
                    </div>
                  </div>
                )}

                {stats && (
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-base font-black tracking-widest uppercase text-white/60 mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> System Stats
                    </h2>
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Total Sessions',    value: stats.total_sessions,    color: 'text-white' },
                        { label: 'Active',            value: stats.active_sessions,   color: 'text-neon-blue' },
                        { label: 'Completed',         value: stats.completed_sessions, color: 'text-green-400' },
                        { label: 'Environment',       value: 'v1.0.0',                color: 'text-purple-400' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center">
                          <span className={`text-3xl font-black ${color}`}>{value}</span>
                          <span className="text-xs font-mono uppercase tracking-widest text-white/40 mt-1 text-center">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {Object.entries(stats.by_difficulty).map(([diff, count]) => (
                        <div key={diff} className={`rounded-xl p-3 border flex justify-between items-center ${diff === 'easy' ? 'border-green-500/20 bg-green-500/5' : diff === 'medium' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                          <span className={`text-sm font-bold uppercase tracking-widest ${diff === 'easy' ? 'text-green-400' : diff === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {diff === 'easy' ? '🟢' : diff === 'medium' ? '🟡' : '🔴'} {diff}
                          </span>
                          <span className={`text-xl font-black ${diff === 'easy' ? 'text-green-400' : diff === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-base font-black tracking-widest uppercase text-white/60 mb-4 flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> Environment Catalog
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Environment ID',   value: 'SatelliteSchedulingEnv-v1',              icon: <Server className="w-4 h-4 text-purple-400" /> },
                      { label: 'Action Space',     value: 'assign_task | change_role | skip',       icon: <BarChart2 className="w-4 h-4 text-neon-blue" /> },
                      { label: 'Observation Space',value: 'satellites[], tasks[], weather, step',   icon: <HardDrive className="w-4 h-4 text-green-400" /> },
                      { label: 'Difficulties',     value: 'Easy · Medium · Hard',                   icon: <Layers className="w-4 h-4 text-yellow-400" /> },
                      { label: 'Max Steps',        value: '20 (easy) / 30 (medium) / 40 (hard)',   icon: <Clock className="w-4 h-4 text-white/60" /> },
                      { label: 'OpenEnv Compliant',value: 'Yes — Deterministic + Score-bounded',   icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/5 flex gap-3 items-start">
                        <div className="mt-0.5 flex-shrink-0">{icon}</div>
                        <div>
                          <p className="text-xs font-mono uppercase tracking-widest text-white/40 mb-0.5">{label}</p>
                          <p className="text-sm font-bold text-white/80 font-mono">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Tab: Sessions ── */}
            {tab === 'sessions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-black tracking-widest uppercase text-white/60">Active Sessions ({sessions.length})</h2>
                  <button onClick={() => { fetchSessions(); fetchStats(); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 text-sm font-bold uppercase tracking-wider transition-all">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/30 gap-4">
                    <Database className="w-16 h-16 opacity-10" />
                    <p className="font-mono text-base">No sessions found. Launch a mission from the Missions panel.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {sessions.map(sess => (
                      <div key={sess.session_id} className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all ${sess.done ? 'border-white/5 bg-white/2 opacity-60' : 'border-purple-500/20 bg-purple-500/5'}`}>
                        <div className="flex justify-between items-start">
                          <code className="text-sm font-mono text-white/50 break-all">{sess.session_id.slice(0, 16)}…</code>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${sess.done ? 'bg-white/10 text-white/40' : 'bg-purple-500/20 text-purple-300 animate-pulse'}`}>
                            {sess.done ? 'Done' : 'Active'}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-mono">
                          <span className={`font-bold ${sess.difficulty === 'easy' ? 'text-green-400' : sess.difficulty === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {sess.difficulty === 'easy' ? '🟢' : sess.difficulty === 'medium' ? '🟡' : '🔴'} {sess.difficulty}
                          </span>
                          <span className="text-white/40">Step {sess.step}</span>
                        </div>
                        <button onClick={() => deleteSession(sess.session_id)}
                          className="mt-1 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-bold uppercase tracking-wider hover:bg-red-500/15 transition-all self-start">
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Tab: Leaderboard ── */}
            {tab === 'leaderboard' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black tracking-widest uppercase text-white/60 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" /> Baseline Leaderboard
                  </h2>
                  <button onClick={fetchLeaderboard} disabled={loadingLB}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm font-bold uppercase tracking-wider hover:bg-yellow-500/20 transition-all disabled:opacity-50">
                    {loadingLB ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3" />}
                    {loadingLB ? 'Running...' : 'Run Benchmark'}
                  </button>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/30 gap-4">
                    <Trophy className="w-16 h-16 opacity-10" />
                    <p className="font-mono text-base">Click "Run Benchmark" to generate leaderboard data.</p>
                    <p className="font-mono text-sm">This runs a greedy baseline agent on all 3 difficulties.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map(row => (
                      <div key={row.difficulty} className={`rounded-2xl border p-5 flex gap-6 items-center ${row.score > 0.7 ? 'border-green-500/30 bg-green-500/5' : row.score > 0.4 ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                        <div className={`text-4xl font-black w-24 text-center flex-shrink-0 ${row.score > 0.7 ? 'text-green-400' : row.score > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {(row.score * 100).toFixed(0)}%
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          {[
                            { label: 'Difficulty', value: `${row.difficulty === 'easy' ? '🟢' : row.difficulty === 'medium' ? '🟡' : '🔴'} ${row.difficulty}` },
                            { label: 'Tasks', value: `${row.tasks_completed}/${row.total_tasks}` },
                            { label: 'Steps', value: String(row.steps) },
                            { label: 'Agent', value: row.agent },
                            { label: 'Reward', value: row.total_reward.toFixed(2) },
                            { label: 'Rank', value: `#${row.rank}` },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-xs font-mono uppercase tracking-widest text-white/30">{label}</p>
                              <p className="text-base font-bold text-white/80 font-mono">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-sm text-white/30 font-mono text-center pt-2">Beat these scores with your RL agent to prove it works!</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Tab: Validation ── */}
            {tab === 'validation' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black tracking-widest uppercase text-white/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> OpenEnv Compliance
                  </h2>
                  <button onClick={fetchValidation} disabled={loadingVal}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-bold uppercase tracking-wider hover:bg-green-500/20 transition-all disabled:opacity-50">
                    {loadingVal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    {loadingVal ? 'Validating...' : 'Run Validation'}
                  </button>
                </div>

                {!validation ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/30 gap-4">
                    <CheckCircle2 className="w-16 h-16 opacity-10" />
                    <p className="font-mono text-base">Click "Run Validation" to check OpenEnv compliance.</p>
                    <p className="font-mono text-sm">Tests determinism, scoring bounds, and environment structure.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className={`rounded-2xl border p-8 flex items-center gap-8 ${validation.validation_status === 'PASS' ? 'border-green-500/40 bg-green-500/8' : 'border-red-500/40 bg-red-500/8'}`}>
                      <div className={`text-7xl font-black ${validation.validation_status === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>
                        {validation.validation_status === 'PASS' ? '✓' : '✗'}
                      </div>
                      <div>
                        <p className={`text-3xl font-black tracking-widest uppercase ${validation.validation_status === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>
                          {validation.validation_status === 'PASS' ? 'OpenEnv Compliant' : 'Validation Failed'}
                        </p>
                        <p className={`text-sm font-mono mt-2 ${validation.openenv_compliant ? 'text-green-400/70' : 'text-red-400/70'}`}>
                          openenv_compliant: {String(validation.openenv_compliant)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(validation.checks ?? {}).map(([diff, check]: any) => (
                        <div key={diff} className={`rounded-2xl border p-5 ${check.deterministic && check.score_in_range ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                          <p className={`text-sm font-black uppercase tracking-wider mb-3 ${diff === 'easy' ? 'text-green-400' : diff === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {diff === 'easy' ? '🟢' : diff === 'medium' ? '🟡' : '🔴'} {diff}
                          </p>
                          <div className="space-y-2 text-sm font-mono">
                            {[
                              { label: 'Deterministic', value: check.deterministic },
                              { label: 'Score in range', value: check.score_in_range },
                              { label: 'Has satellites', value: check.has_satellites },
                              { label: 'Has tasks',      value: check.has_tasks },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex justify-between items-center">
                                <span className="text-white/50">{label}</span>
                                <span className={value ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                  {value ? '✓ PASS' : '✗ FAIL'}
                                </span>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                              <span className="text-white/50">Score</span>
                              <span className={`font-black text-base ${check.score > 0.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {(check.score * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
