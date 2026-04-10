import React, { useState, useEffect, useRef } from 'react';
import { Bell, Music, Radio, Sun, Moon, MapPin, UploadCloud, Play, Pause, Settings, Mic2, Activity, Volume2, X, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { Coordinates, CalculationMethod, PrayerTimes, adhan } from 'adhan';

// --- GLASS PANEL UTILITY ---
const GlassPanel = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 ${className}`}>
    {children}
  </div>
);

// --- MODAL UTILITY ---
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-50">
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
function App() {
  const [time, setTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [radioIndex, setRadioIndex] = useState(0);
  
  const [alarms, setAlarms] = useState([]);
  const [musicFiles, setMusicFiles] = useState([]);
  
  const [isAlarmModalOpen, setAlarmModalOpen] = useState(false);
  const [isMosqueModalOpen, setMosqueModalOpen] = useState(false);
  
  const [prayers, setPrayers] = useState({});
  const [nextPrayerName, setNextPrayerName] = useState("");
  
  const fileInputRef = useRef(null);

  const radioStations = [
    { name: "Quran Kareem", location: "Cairo, Egypt", url: "http://radiostream.com/quran" },
    { name: "Mega FM 92.7", location: "Cairo, Egypt", url: "http://radiostream.com/mega" },
    { name: "Nogoum FM 100.6", location: "Cairo, Egypt", url: "http://radiostream.com/nogoum" },
    { name: "Radio Misr 88.7", location: "Cairo, Egypt", url: "http://radiostream.com/misr" },
    { name: "90s FM", location: "Cairo, Egypt", url: "http://radiostream.com/90s" },
    { name: "Mix FM", location: "Cairo, Egypt", url: "http://radiostream.com/mix" },
    { name: "Radio HIT", location: "Cairo, Egypt", url: "http://radiostream.com/hit" }
  ];

  const currentRadio = radioStations[radioIndex];

  // Tick clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchAlarms();
    fetchMusic();
    calculatePrayers();
  }, [time.getDate()]); // re-calculate prayers if day changes

  const fetchAlarms = async () => {
    try {
      const res = await axios.get("/api/alarms");
      setAlarms(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMusic = async () => {
    try {
      const res = await axios.get("/api/music");
      setMusicFiles(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const calculatePrayers = () => {
    // Cairo coordinates roughly
    const coordinates = new Coordinates(30.0444, 31.2357);
    const params = CalculationMethod.Egyptian();
    const prayerTimes = new PrayerTimes(coordinates, new Date(), params);
    
    setPrayers({
      Fajr: prayerTimes.fajr,
      Dhuhr: prayerTimes.dhuhr,
      Asr: prayerTimes.asr,
      Maghrib: prayerTimes.maghrib,
      Isha: prayerTimes.isha
    });
    setNextPrayerName(prayerTimes.nextPrayer());
  };

  const formatPrayerTime = (dateObj) => {
    if (!dateObj) return "--:--";
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post("/api/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Upload complete!");
      fetchMusic();
    } catch (e) {
      console.error(e);
      alert("Upload failed.");
    }
  };

  // Test Speaker
  const testSpeaker = async () => {
    try {
      await axios.get("/api/test_speaker");
    } catch (e) {
      console.error(e);
    }
  };

  // Radio toggling
  const handlePlayToggle = async () => {
    const newStatus = !isPlaying;
    setIsPlaying(newStatus);
    try {
      await axios.post("/api/radio", {
        url: currentRadio.url,
        action: newStatus ? "play" : "pause"
      });
    } catch(e) {
      console.error("Radio stream failed", e);
    }
  };

  const nextRadio = () => {
    setRadioIndex((prev) => (prev + 1) % radioStations.length);
    setIsPlaying(false); // reset state to require manual play
  };
  const prevRadio = () => {
    setRadioIndex((prev) => (prev - 1 + radioStations.length) % radioStations.length);
    setIsPlaying(false);
  };

  // Alarm actions
  const toggleAlarm = async (id) => {
    try {
      await axios.patch(`/api/alarms/${id}/toggle`);
      fetchAlarms();
    } catch (e) {}
  };
  
  const deleteAlarm = async (id) => {
    try {
      await axios.delete(`/api/alarms/${id}`);
      fetchAlarms();
    } catch (e) {}
  };

  const submitAlarm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await axios.post("/api/alarms", {
        time: fd.get("time"),
        label: fd.get("label"),
        days: "Mon,Tue,Wed,Thu,Fri", // Simplified
        sound_file: fd.get("sound_file"),
        active: true
      });
      setAlarmModalOpen(false);
      fetchAlarms();
    } catch (err) {}
  };

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8 flex flex-col font-sans relative overflow-hidden" 
         style={{ background: 'linear-gradient(135deg, #0f172a 0%, #171717 100%)' }}>
      
      {/* Dynamic Backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[150px] pointer-events-none"></div>
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
          <button onClick={testSpeaker} className="flex items-center bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-sm border border-white/10 shadow hover:shadow-lg">
            <Volume2 className="w-4 h-4 mr-2" /> Test Speaker
          </button>
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
            <h2 className="text-6xl font-black tracking-tighter mb-2" suppressHydrationWarning>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </h2>
            <p className="text-lg text-slate-300 font-medium">
              {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </GlassPanel>

          <GlassPanel className="flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" /> Alarms
              </h3>
              <button 
                onClick={() => setAlarmModalOpen(true)}
                className="text-sm bg-purple-500/20 hover:bg-purple-500/40 px-3 py-1 rounded-full text-purple-300 transition-colors shadow">
                + Add
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto max-h-[300px] flex-grow">
              {alarms.length === 0 && <p className="text-center text-slate-500 mt-4 text-sm font-medium">No alarms active</p>}
              {alarms.map(alarm => (
                <div key={alarm.id} className={`bg-black/20 p-4 rounded-2xl flex justify-between items-center border hover:border-purple-500/30 transition-all ${alarm.active ? 'border-purple-500/50' : 'border-white/5 opacity-60'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-2xl font-bold">{alarm.time}</h4>
                      {alarm.sound_file && <Volume2 className="w-3 h-3 text-slate-400" />}
                    </div>
                    <p className="text-sm text-slate-400">{alarm.label}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div onClick={() => toggleAlarm(alarm.id)} className={`w-12 h-6 ${alarm.active ? 'bg-purple-500' : 'bg-slate-600'} rounded-full relative cursor-pointer transition-colors shadow-inner`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-md ${alarm.active ? 'right-1' : 'left-1'}`}></div>
                    </div>
                    <button onClick={() => deleteAlarm(alarm.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center"><Trash2 className="w-3 h-3 mr-1" /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Center Col: Media Hub */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassPanel className="h-full flex flex-col">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Radio className="w-5 h-5 text-blue-400" /> Web Radio
            </h3>
            
            <div className="flex-grow flex flex-col items-center justify-center">
              <div className="aspect-square w-full max-w-[200px] mx-auto bg-gradient-to-br from-indigo-900 to-purple-900 rounded-[2.5rem] mb-8 flex items-center justify-center relative overflow-hidden group shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),0_10px_20px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                {/* Central animated ring while playing */}
                {isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 border-2 border-white/20 rounded-full animate-ping"></div>
                  </div>
                )}
                <Radio className={`w-20 h-20 text-white/80 transition-transform duration-500 ${isPlaying ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : ''}`} />
                {isPlaying && (
                  <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse drop-shadow-[0_0_5px_currentColor]"></span>
                    LIVE
                  </div>
                )}
              </div>

              <div className="w-full">
                <div className="flex items-center justify-between mb-8 px-2 bg-black/20 p-2 rounded-2xl border border-white/5 shadow-inner">
                   <button onClick={prevRadio} className="p-2 bg-white/5 rounded-full hover:bg-white/20 transition-all text-white/70 hover:text-white">
                     <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                   </button>
                   <div className="text-center mx-2 flex-grow min-w-0">
                     <h4 className="text-xl font-bold truncate tracking-wide text-white drop-shadow-md">{currentRadio.name}</h4>
                     <p className="text-blue-300 text-xs mt-1 truncate uppercase tracking-widest font-bold">{currentRadio.location}</p>
                   </div>
                   <button onClick={nextRadio} className="p-2 bg-white/5 rounded-full hover:bg-white/20 transition-all text-white/70 hover:text-white">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                   </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-6 mt-auto">
              <button className="p-4 bg-slate-800/80 hover:bg-slate-700 rounded-full transition-all border border-white/10 shadow-lg group relative overflow-hidden">
                <Music className="w-5 h-5 text-purple-300 relative z-10 group-hover:scale-110 transition-transform" />
              </button>
              
              <button 
                onClick={handlePlayToggle}
                className={`p-5 rounded-full transition-all border shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] transform hover:-translate-y-1 hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.7)] text-white flex items-center justify-center w-[80px] h-[80px] ${isPlaying ? 'bg-indigo-600 border-indigo-400' : 'bg-blue-600 border-blue-400'}`}>
                {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current translate-x-1" />}
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-4 bg-slate-800/80 hover:bg-slate-700 rounded-full transition-all border border-white/10 shadow-lg group relative overflow-hidden">
                <UploadCloud className="w-5 h-5 text-blue-300 relative z-10 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </GlassPanel>
        </div>

        {/* Right Col: Mawaqit & Upload */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <GlassPanel className="relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12 pointer-events-none">
               <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>
            </div>
            
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-emerald-400" /> Islamic Assistant
            </h3>
            
            <div className="bg-black/30 rounded-2xl p-5 border border-emerald-500/20 mb-5 shadow-inner">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Next Prayer
              </p>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <h4 className="text-4xl font-light tracking-wide text-white drop-shadow-sm capitalize">
                  {nextPrayerName !== "none" ? nextPrayerName : "Isha"}
                </h4>
                <span className="text-2xl font-medium text-emerald-300 font-mono tracking-tight">
                  {nextPrayerName !== "none" && prayers[nextPrayerName.charAt(0).toUpperCase() + nextPrayerName.slice(1)] ? formatPrayerTime(prayers[nextPrayerName.charAt(0).toUpperCase() + nextPrayerName.slice(1)]) : "--:--"}
                </span>
              </div>
            </div>

            <div className="space-y-[2px] bg-black/10 rounded-xl p-2 border border-white/5">
              {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((p) => (
                <div key={p} className={`flex justify-between text-sm px-3 py-2 rounded-lg transition-colors ${nextPrayerName.toLowerCase() === p.toLowerCase() ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 font-medium'}`}>
                  <span>{p}</span><span className="font-mono">{formatPrayerTime(prayers[p])}</span>
                </div>
              ))}
            </div>
            
            <button onClick={() => setMosqueModalOpen(true)} className="w-full mt-5 py-3 bg-white/5 hover:bg-white/10 hover:shadow-md rounded-xl transition-all border border-white/10 text-sm font-semibold flex items-center justify-center gap-2 text-slate-300 hover:text-white">
              <Settings className="w-4 h-4"/> Configure Adhan
            </button>
          </GlassPanel>

          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".mp3,.wav" />
          
          <GlassPanel 
            onClick={() => fileInputRef.current?.click()}
            className="flex-grow flex flex-col justify-center items-center text-center p-6 border-dashed border-2 border-white/20 hover:border-blue-400/50 hover:bg-blue-500/5 transition-all cursor-pointer group shadow-sm hover:shadow-lg">
            <div className="p-4 bg-blue-500/10 rounded-full mb-4 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all border border-blue-500/20 shadow-inner">
              <UploadCloud className="w-8 h-8 text-blue-400 drop-shadow-[0_0_8px_currentColor]" />
            </div>
            <h4 className="font-bold text-lg mb-1 tracking-wide">Local Storage</h4>
            <p className="text-sm text-slate-400 leading-relaxed max-w-[200px]">
              Tap to browse or Drop MP3s directly to the 50GB Pi Volume
            </p>
          </GlassPanel>
        </div>

      </main>

      {/* --- ADD ALARM MODAL --- */}
      <Modal isOpen={isAlarmModalOpen} onClose={() => setAlarmModalOpen(false)} title="New Alarm">
        <form onSubmit={submitAlarm} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Time</label>
            <input name="time" type="time" defaultValue="07:00" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors" required/>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Label (TTS Pronouncement)</label>
            <input name="label" type="text" placeholder="e.g. Morning Workout" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors" required/>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300 flex items-center gap-2"><Music className="w-4 h-4"/> Local Sound File</label>
            <select name="sound_file" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors">
              <option value="">(None - Use TTS only)</option>
              {musicFiles.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-purple-600/30 flex justify-center items-center gap-2 mt-6">
            <Plus className="w-5 h-5"/> Save Alarm
          </button>
        </form>
      </Modal>

      {/* --- MOSQUE CONFIG MODAL --- */}
      <Modal isOpen={isMosqueModalOpen} onClose={() => setMosqueModalOpen(false)} title="Configure Adhan Output">
        <div className="space-y-4 text-center">
          <MapPin className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
          <h4 className="text-xl font-bold">Prayer Synchronization</h4>
          <p className="text-sm text-slate-400">Select MP3 tracks for local playback during prayer times. Synchronization is currently locked to Cairo Coordinates.</p>
          
          <div className="space-y-3 mt-4 text-left">
             <label className="block text-sm font-bold text-slate-300 mt-4">Fajr Adhan Track</label>
             <select className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm">
                <option value="">Default Backend Adhan</option>
                {musicFiles.map(f => <option key={f} value={f}>{f}</option>)}
             </select>
             
             <label className="block text-sm font-bold text-slate-300 mt-2">Standard Adhan Track</label>
             <select className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm">
                <option value="">Default Backend Adhan</option>
                {musicFiles.map(f => <option key={f} value={f}>{f}</option>)}
             </select>
          </div>

          <button onClick={() => setMosqueModalOpen(false)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-600/30 mt-6">
            Apply Configuration
          </button>
        </div>
      </Modal>

    </div>
  );
}

export default App;
