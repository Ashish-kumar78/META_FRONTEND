import React from 'react';
import { Dashboard } from './Dashboard';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';

export function Interface({ selectedSatellite, setSelectedSatellite, onShowGlobal }: any) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
      {/* Header */}
      <header className="p-6 md:p-10 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="relative">
            <Rocket className="w-10 h-10 text-neon-blue drop-shadow-[0_0_15px_rgba(0,240,255,1)]" />
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-2 border border-neon-blue/30 rounded-full border-t-neon-blue shadow-[0_0_10px_rgba(0,240,255,0.5)]" 
            />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-neon-blue drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] filter">
              ANTARIKSH
            </h1>
            <p className="text-sm text-blue-300/80 tracking-[0.3em] uppercase mt-1">Orbital Intelligence System</p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hidden md:flex items-center gap-8 text-sm font-bold tracking-widest text-blue-100/80"
        >
          <span className="hover:text-neon-blue hover:shadow-[0_0_15px_rgba(0,240,255,0.8)] cursor-pointer pointer-events-auto transition-all">MISSIONS</span>
          <span className="hover:text-neon-blue hover:shadow-[0_0_15px_rgba(0,240,255,0.8)] cursor-pointer pointer-events-auto transition-all">DATABASE</span>
          <span 
            onClick={onShowGlobal}
            className="hover:text-neon-blue hover:shadow-[0_0_15px_rgba(0,240,255,0.8)] cursor-pointer pointer-events-auto transition-all"
          >
            SYSTEMS
          </span>
        </motion.div>
      </header>

      {/* Main UI Area */}
      <div className="flex-1 relative p-6 md:p-10 pointer-events-none">
        <Dashboard 
          selectedSatellite={selectedSatellite} 
          setSelectedSatellite={setSelectedSatellite} 
        />
        
        {/* Navigation Hint */}
        {!selectedSatellite && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          >
            <div className="w-[2px] h-16 bg-gradient-to-b from-transparent via-neon-blue to-transparent animate-pulse" />
            <p className="text-sm font-bold tracking-[0.2em] text-neon-blue/80 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] uppercase">Select an orbital asset</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
