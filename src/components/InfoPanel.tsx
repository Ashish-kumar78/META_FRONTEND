import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Satellite, Compass, Calendar, Activity, Rocket } from 'lucide-react';

export function InfoPanel({ selectedSatellite, setSelectedSatellite }: any) {
  return (
    <AnimatePresence>
      {selectedSatellite && (
        <motion.div
          initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="absolute right-6 md:right-10 top-10 w-80 md:w-96 pointer-events-auto"
        >
          {/* Glassmorphism Container */}
          <div className="relative rounded-2xl overflow-hidden bg-space-800/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] group">
            {/* Ambient Glow */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-neon-blue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"></div>
            
            <div className="relative p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="w-full mr-4">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <div className="flex items-center gap-2 text-neon-blue">
                      <Rocket className="w-4 h-4" />
                      <span className="text-xs tracking-widest font-bold uppercase">{selectedSatellite.status}</span>
                    </div>
                    {selectedSatellite.isPremium && (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-gradient-to-r from-[#ffaa00] to-[#ff4400] text-black shadow-[0_0_8px_rgba(255,170,0,0.5)]">Flagship</span>
                    )}
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide leading-tight">{selectedSatellite.name}</h2>
                  <p className="text-[10px] md:text-xs text-blue-200/50 uppercase tracking-widest mt-1 font-bold">{selectedSatellite.agency}</p>
                </div>
                <button 
                  onClick={() => setSelectedSatellite(null)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Data Grid */}
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3 text-blue-200/70 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs tracking-widest uppercase">Purpose</span>
                  </div>
                  <p className="text-white font-medium pl-7">{selectedSatellite.purpose}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 text-blue-200/70 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs tracking-widest uppercase">Launch</span>
                    </div>
                    <p className="text-white font-medium pl-6">{selectedSatellite.launchDate}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 text-blue-200/70 mb-1">
                      <Compass className="w-4 h-4" />
                      <span className="text-xs tracking-widest uppercase">Orbit</span>
                    </div>
                    <p className="text-white font-medium pl-6 text-sm">{selectedSatellite.orbitType}</p>
                  </div>
                </div>

                {/* Simulated Telemetry */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs tracking-widest text-blue-200/70 uppercase">Signal Strength</span>
                    <span className="text-xs text-neon-blue font-bold">98%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '98%' }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      className="h-full bg-neon-blue shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom Trim */}
            <div className={`h-1 w-full`} style={{ background: `linear-gradient(90deg, ${selectedSatellite.color}, transparent)` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
