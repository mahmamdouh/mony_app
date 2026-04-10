import React, { useState, useEffect } from 'react';
import { Bell, Music, Radio, Sun, Moon, MapPin, UploadCloud, Play, Pause, Settings, Mic2, Activity } from 'lucide-react';
import axios from 'axios';

// Glass Panel Component
const GlassPanel = ({ children, className = '' }) => (
  <div className={`bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 ${className}`}>
    {children}
  </div>
);

function App() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8 flex flex-col font-sans relative overflow-hidden" 
         style={{ background: 'linear-gradient(135deg, #0f172a 0%, #171717 100%)' }}>
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/30 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[150px] pointer-events-none"></div>
      
      {/* Header */}
      <header className="flex justify-between items-center mb-8 relative z-10 w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30">
            <Mic2 className="text-purple-400 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              Mony
            </h1>
            <p className="text-sm text-slate-400">Smart Assistant & Media Hub</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <GlassPanel className="!p-3 !rounded-2xl flex items-center justify-center">
            <Activity className="text-emerald-400 w-5 h-5 animate-pulse" />
            <span className="ml-2 text-sm font-medium">Online</span>
          </GlassPanel>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 w-full max-w-6xl mx-auto">
        
        {/* Left Col: Clock & Alarms */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassPanel className="flex flex-col items-center justify-center py-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-50">
              {time.getHours() >= 6 && time.getHours() < 18 ? <Sun className="w-8 h-8 text-yellow-400"/> : <Moon className="w-8 h-8 text-blue-300"/>}
            </div>
            <h2 className="text-6xl font-black tracking-tighter mb-2">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h2>
            <p className="text-lg text-slate-300 font-medium">
              {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </GlassPanel>

          <GlassPanel className="flex-grow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" /> Alarms
              </h3>
              <button className="text-sm bg-purple-500/20 hover:bg-purple-500/40 px-3 py-1 rounded-full text-purple-300 transition-colors">
                + Add
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Dummy Alarm Card */}
              <div className="bg-black/20 p-4 rounded-2xl flex justify-between items-center border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer">
                <div>
                  <h4 className="text-2xl font-bold">07:00</h4>
                  <p className="text-sm text-slate-400">Morning Gym</p>
                </div>
                <div className="w-12 h-6 bg-purple-500 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-1 top-0.5 shadow-md"></div>
                </div>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl flex justify-between items-center border border-white/5 opacity-60">
                <div>
                  <h4 className="text-2xl font-bold">22:00</h4>
                  <p className="text-sm text-slate-400">Sleep Reminder</p>
                </div>
                <div className="w-12 h-6 bg-slate-600 rounded-full relative">
                  <div className="w-5 h-5 bg-slate-300 rounded-full absolute left-1 top-0.5"></div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Center Col: Media & Cast */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassPanel className="h-full flex flex-col">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Music className="w-5 h-5 text-blue-400" /> Media Center
            </h3>
            
            <div className="aspect-square bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden group shadow-inner">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
              <Radio className="w-24 h-24 text-white/50 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                LIVE
              </div>
            </div>

            <div className="text-center mb-6">
              <h4 className="text-2xl font-bold truncate">Quran Kareem Radio</h4>
              <p className="text-slate-400 text-sm mt-1">Cairo, Egypt</p>
            </div>

            <div className="flex justify-center items-center gap-6 mt-auto">
              <button className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5">
                <music className="w-6 h-6" />
              </button>
              <button className="p-5 bg-blue-500 hover:bg-blue-400 rounded-full transition-all shadow-lg shadow-blue-500/20 transform hover:scale-105 text-white">
                <Play className="w-8 h-8 fill-current" />
              </button>
              <button className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5">
                <UploadCloud className="w-6 h-6" />
              </button>
            </div>
          </GlassPanel>
        </div>

        {/* Right Col: Mawaqit & Upload */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <GlassPanel className="relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12 pointer-events-none">
               {/* Pattern / Decorative */}
               <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>
            </div>
            
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-emerald-400" /> Islamic Assistant
            </h3>
            
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5 mb-4">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Next Prayer</p>
              <div className="flex justify-between items-end">
                <h4 className="text-4xl font-light">Asr</h4>
                <span className="text-xl font-medium text-slate-300">15:30</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-400 px-2">
                <span>Fajr</span><span>04:45</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400 px-2">
                <span>Dhuhr</span><span>12:05</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-300 font-medium px-2 bg-emerald-900/30 rounded-lg py-1 border border-emerald-500/20">
                <span>Asr</span><span>15:30</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400 px-2">
                <span>Maghrib</span><span>18:15</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400 px-2">
                <span>Isha</span><span>19:40</span>
              </div>
            </div>
            
            <button className="w-full mt-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 text-sm font-medium flex items-center justify-center gap-2">
              <Settings className="w-4 h-4"/> Configure Mosque
            </button>
          </GlassPanel>

          <GlassPanel className="flex-grow flex flex-col justify-center items-center text-center p-6 border-dashed border-2 border-white/20 hover:border-blue-400/50 transition-colors cursor-pointer group">
            <div className="p-4 bg-blue-500/10 rounded-full mb-3 group-hover:bg-blue-500/20 transition-colors">
              <UploadCloud className="w-8 h-8 text-blue-400" />
            </div>
            <h4 className="font-bold text-lg mb-1">Local Storage</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Drag & drop MP3s here to upload to the Pi (50GB volume)
            </p>
          </GlassPanel>
        </div>

      </main>
    </div>
  );
}

export default App;
