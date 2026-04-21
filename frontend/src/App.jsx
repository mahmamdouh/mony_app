import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Music, Radio, Sun, Moon, MapPin, UploadCloud,
  Play, Pause, Settings, Mic2, Activity, Volume2, X, Plus,
  Trash2, CalendarClock, Calendar, Clock, AlarmCheck
} from 'lucide-react';
import axios from 'axios';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

// ── Utilities ─────────────────────────────────────────────────────────────────
const GlassPanel = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
};

// Toast banner for triggered events
const Toast = ({ event, onDismiss }) => (
  <div className="fixed top-6 right-6 z-[100] max-w-sm animate-slide-in">
    <div className="bg-gradient-to-r from-amber-500/90 to-orange-600/90 backdrop-blur-xl border border-amber-400/30 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
      <div className="p-2 bg-white/20 rounded-xl flex-shrink-0">
        <Bell className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm">Event Reminder</p>
        <p className="text-amber-100 text-sm mt-0.5 truncate">{event.label}</p>
        {event.sound_file && (
          <p className="text-amber-200/70 text-xs mt-1 truncate">🎵 {event.sound_file}</p>
        )}
      </div>
      <button onClick={onDismiss} className="text-white/70 hover:text-white transition-colors flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Day-of-week pill selector
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DayPicker = ({ selected, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {DAYS.map(d => (
      <button
        key={d}
        type="button"
        onClick={() => {
          const next = selected.includes(d)
            ? selected.filter(x => x !== d)
            : [...selected, d];
          onChange(next);
        }}
        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
          selected.includes(d)
            ? 'bg-purple-500 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
            : 'bg-white/5 border-white/10 text-slate-400 hover:border-purple-500/50 hover:text-slate-200'
        }`}
      >
        {d}
      </button>
    ))}
  </div>
);

// Day badges displayed on alarm cards
const DayBadges = ({ days }) => {
  const active = days ? days.split(',') : [];
  return (
    <div className="flex gap-0.5 mt-1 flex-wrap">
      {DAYS.map(d => (
        <span key={d} className={`text-[10px] px-1 py-0.5 rounded font-bold ${
          active.includes(d) ? 'bg-purple-500/30 text-purple-300' : 'text-slate-600'
        }`}>{d.slice(0, 1)}</span>
      ))}
    </div>
  );
};


// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [time, setTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [radioIndex, setRadioIndex] = useState(0);

  const [alarms, setAlarms] = useState([]);
  const [events, setEvents] = useState([]);
  const [musicFiles, setMusicFiles] = useState([]);

  const [leftTab, setLeftTab] = useState('alarms'); // 'alarms' | 'events'

  const [isAlarmModalOpen, setAlarmModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isMosqueModalOpen, setMosqueModalOpen] = useState(false);

  // Alarm form state
  const [alarmDays, setAlarmDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  // Event form state
  const [eventForm, setEventForm] = useState({ date: '', time: '', label: '', sound_file: '' });

  const [searchResults, setSearchResults] = useState([]);
  const [selectedMosque, setSelectedMosque] = useState(null);
  const [adhanSettings, setAdhanSettings] = useState({ Fajr: '', Dhuhr: '', Asr: '', Maghrib: '', Isha: '' });
  const [prayers, setPrayers] = useState({});
  const [nextPrayerName, setNextPrayerName] = useState('');

  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState('');
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  const [isSyncingMawaqit, setIsSyncingMawaqit] = useState(false);
  const [volume, setVolume] = useState(50);

  // Toast state
  const [activeToast, setActiveToast] = useState(null);

  const fileInputRef = useRef(null);

  const radioStations = [
    { name: 'Quran Kareem Radio (Cairo)', location: 'Cairo, Egypt', url: 'https://n03.radiojar.com/8s5u5tpdtwzuv' },
    { name: 'Quran Kareem Radio 2 (Cairo)', location: 'Cairo, Egypt', url: 'http://n0a.radiojar.com/8s5u5tpdtwzuv' },
    { name: 'Radio 9090 FM', location: 'Cairo, Egypt', url: 'https://9090streaming.mobtada.com/9090FMEGYPT' },
    { name: 'BBC Arabic', location: 'London, UK', url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio' },
  ];

  const currentRadio = radioStations[radioIndex];

  // ── Clock tick ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Initial fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAlarms();
    fetchEvents();
    fetchMusic();
    fetchSongs();
    fetchMawaqitSettings();
    fetchVolume();
    calculatePrayers();
  }, [time.getDate()]);

  // ── Events due polling (every 30s) ──────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await axios.get('/api/events/due');
        if (res.data && res.data.length > 0) {
          const evt = res.data[0];
          setActiveToast(evt);
          // Play ringtone if set
          if (evt.sound_file) {
            await axios.post('/api/songs/play', { filename: evt.sound_file, action: 'play' });
          }
          // Refresh events list
          fetchEvents();
        }
      } catch (e) { /* silent */ }
    };
    poll(); // immediate first check
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Dismiss toast after 15s ─────────────────────────────────────────────────
  useEffect(() => {
    if (!activeToast) return;
    const t = setTimeout(() => setActiveToast(null), 15000);
    return () => clearTimeout(t);
  }, [activeToast]);

  // ── Data fetchers ───────────────────────────────────────────────────────────
  const fetchVolume = async () => {
    try { const r = await axios.get('/api/volume'); setVolume(r.data.level || 50); } catch { }
  };
  const setSystemVolume = async (val) => {
    try { await axios.post('/api/volume', { level: parseInt(val) }); } catch { }
  };
  const fetchSongs = async () => {
    try {
      const r = await axios.get('/api/music');
      setSongs(r.data);
      if (r.data.length > 0) setSelectedSong(r.data[0]);
    } catch { }
  };
  const fetchMawaqitSettings = async () => {
    try {
      const r = await axios.get('/api/mawaqit/settings');
      if (r.data) {
        setAdhanSettings({
          Fajr: r.data.fajr_adhan || '', Dhuhr: r.data.dhuhr_adhan || '',
          Asr: r.data.asr_adhan || '', Maghrib: r.data.maghrib_adhan || '',
          Isha: r.data.isha_adhan || ''
        });
        if (r.data.mosque_uuid) setSelectedMosque({ uuid: r.data.mosque_uuid, name: r.data.mosque_name });
      }
    } catch { }
  };
  const fetchAlarms = async () => {
    try { const r = await axios.get('/api/alarms'); setAlarms(r.data); } catch { }
  };
  const fetchEvents = async () => {
    try { const r = await axios.get('/api/events'); setEvents(r.data); } catch { }
  };
  const fetchMusic = async () => {
    try { const r = await axios.get('/api/music'); setMusicFiles(r.data); } catch { }
  };

  const calculatePrayers = () => {
    const coord = new Coordinates(30.0444, 31.2357);
    const pt = new PrayerTimes(coord, new Date(), CalculationMethod.Egyptian());
    setPrayers({ Fajr: pt.fajr, Dhuhr: pt.dhuhr, Asr: pt.asr, Maghrib: pt.maghrib, Isha: pt.isha });
    setNextPrayerName(pt.nextPrayer());
  };

  const formatPrayerTime = (d) => {
    if (!d) return '--:--';
    if (typeof d === 'string') return d;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await axios.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchMusic();
    } catch { }
  };

  const testSpeaker = async () => {
    try { await axios.get('/api/test_speaker'); } catch { }
  };

  const handlePlayToggle = async () => {
    const next = !isPlaying;
    setIsPlaying(next);
    try {
      await axios.post('/api/radio', { url: currentRadio.url, action: next ? 'play' : 'pause' });
    } catch { }
  };

  const scanNearestMosques = async () => {
    setIsSyncingMawaqit(true);
    setSearchResults([]);
    try { const r = await axios.get('/api/mawaqit/scan'); setSearchResults(r.data.results || []); } catch { }
    setIsSyncingMawaqit(false);
  };

  const handleMosqueSelect = async (mosque) => {
    setSelectedMosque(mosque);
    setSearchResults([]);
    setIsSyncingMawaqit(true);
    try {
      const r = await axios.get(`/api/mawaqit/sync?slug=${mosque.slug || mosque.uuid}`);
      if (r.data.status === 'ok' && r.data.times) {
        const t = r.data.times;
        if (t.length >= 5) setPrayers({ Fajr: t[0], Dhuhr: t[1], Asr: t[2], Maghrib: t[3], Isha: t[4] });
      }
    } catch { }
    setIsSyncingMawaqit(false);
  };

  const saveMawaqitConfig = async () => {
    try {
      await axios.post('/api/mawaqit/settings', {
        mosque_uuid: selectedMosque?.uuid || '',
        mosque_name: selectedMosque?.name || '',
        fajr_adhan: adhanSettings.Fajr,
        dhuhr_adhan: adhanSettings.Dhuhr,
        asr_adhan: adhanSettings.Asr,
        maghrib_adhan: adhanSettings.Maghrib,
        isha_adhan: adhanSettings.Isha,
      });
      setMosqueModalOpen(false);
    } catch { }
  };

  const nextRadio = () => { setRadioIndex(p => (p + 1) % radioStations.length); setIsPlaying(false); };
  const prevRadio = () => { setRadioIndex(p => (p - 1 + radioStations.length) % radioStations.length); setIsPlaying(false); };

  const handleSongPlayToggle = async () => {
    const next = !isSongPlaying;
    setIsSongPlaying(next);
    try { await axios.post('/api/songs/play', { filename: selectedSong, action: next ? 'play' : 'pause' }); } catch { }
  };

  const toggleAlarm = async (id) => {
    try { await axios.patch(`/api/alarms/${id}/toggle`); fetchAlarms(); } catch { }
  };
  const deleteAlarm = async (id) => {
    try { await axios.delete(`/api/alarms/${id}`); fetchAlarms(); } catch { }
  };

  const submitAlarm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await axios.post('/api/alarms', {
        time: fd.get('time'),
        label: fd.get('label'),
        days: alarmDays.join(','),
        sound_file: fd.get('sound_file') || null,
        active: true,
      });
      setAlarmModalOpen(false);
      setAlarmDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      fetchAlarms();
    } catch (err) {
      console.error('Save alarm failed:', err.response?.status, err.response?.data || err.message);
      alert(`Failed to save alarm: ${err.response?.data?.detail || err.message}`);
    }
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    const dt = `${eventForm.date}T${eventForm.time}`;
    try {
      await axios.post('/api/events', {
        datetime: dt,
        label: eventForm.label,
        sound_file: eventForm.sound_file || null,
      });
      setEventModalOpen(false);
      setEventForm({ date: '', time: '', label: '', sound_file: '' });
      fetchEvents();
    } catch (err) {
      console.error('Save event failed:', err.response?.status, err.response?.data || err.message);
      alert(`Failed to save event: ${err.response?.data?.detail || err.message}`);
    }
  };

  const deleteEvent = async (id) => {
    try { await axios.delete(`/api/events/${id}`); fetchEvents(); } catch { }
  };

  const formatEventDatetime = (dt) => {
    try {
      const d = new Date(dt);
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch { return dt; }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-slate-100 p-4 md:p-8 flex flex-col font-sans relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #171717 100%)' }}
    >
      {/* Ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[150px] pointer-events-none" />

      {/* Toast */}
      {activeToast && (
        <Toast event={activeToast} onDismiss={() => setActiveToast(null)} />
      )}

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
            <p className="text-sm text-slate-400">Smart Assistant &amp; Media Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl shadow-inner">
            <Volume2 className="w-4 h-4 text-slate-300" />
            <input
              type="range" min="0" max="100" value={volume}
              onChange={e => setVolume(e.target.value)}
              onMouseUp={e => setSystemVolume(e.target.value)}
              onTouchEnd={e => setSystemVolume(e.target.value)}
              className="w-24 accent-purple-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-400 w-6 text-right">{volume}%</span>
          </div>
          <button onClick={testSpeaker} className="flex items-center bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-sm border border-white/10">
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

        {/* ── Left Column: Alarms & Events Tabs ─────────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Clock */}
          <GlassPanel className="flex flex-col items-center justify-center py-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-50">
              {time.getHours() >= 6 && time.getHours() < 18
                ? <Sun className="w-8 h-8 text-yellow-400" />
                : <Moon className="w-8 h-8 text-blue-300" />}
            </div>
            <h2 className="text-6xl font-black tracking-tighter mb-2" suppressHydrationWarning>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </h2>
            <p className="text-lg text-slate-300 font-medium">
              {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </GlassPanel>

          {/* Tab panel */}
          <GlassPanel className="flex-grow flex flex-col">
            {/* Tab switcher */}
            <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-2xl border border-white/5">
              <button
                onClick={() => setLeftTab('alarms')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${
                  leftTab === 'alarms'
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40 shadow'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Bell className="w-4 h-4" /> Alarms
              </button>
              <button
                onClick={() => setLeftTab('events')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${
                  leftTab === 'events'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <CalendarClock className="w-4 h-4" /> Events
              </button>
            </div>

            {/* ── ALARMS TAB ── */}
            {leftTab === 'alarms' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-300">{alarms.length} alarm{alarms.length !== 1 ? 's' : ''}</span>
                  </h3>
                  <button
                    onClick={() => setAlarmModalOpen(true)}
                    className="text-sm bg-purple-500/20 hover:bg-purple-500/40 px-3 py-1.5 rounded-full text-purple-300 transition-colors shadow flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <div className="space-y-3 overflow-y-auto flex-grow max-h-[340px]">
                  {alarms.length === 0 && (
                    <div className="text-center py-8 text-slate-600">
                      <AlarmCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No alarms set</p>
                    </div>
                  )}
                  {alarms.map(alarm => (
                    <div
                      key={alarm.id}
                      className={`bg-black/20 p-4 rounded-2xl border transition-all ${
                        alarm.active ? 'border-purple-500/50' : 'border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-2xl font-black tracking-tight">{alarm.time}</h4>
                            {alarm.sound_file && <Music className="w-3 h-3 text-purple-400" />}
                          </div>
                          <p className="text-sm text-slate-400 font-medium">{alarm.label}</p>
                          <DayBadges days={alarm.days} />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            onClick={() => toggleAlarm(alarm.id)}
                            className={`w-11 h-6 ${alarm.active ? 'bg-purple-500' : 'bg-slate-700'} rounded-full relative cursor-pointer transition-colors`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${alarm.active ? 'right-1' : 'left-1'}`} />
                          </div>
                          <button onClick={() => deleteAlarm(alarm.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── EVENTS TAB ── */}
            {leftTab === 'events' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-300">{events.length} event{events.length !== 1 ? 's' : ''}</span>
                  </h3>
                  <button
                    onClick={() => setEventModalOpen(true)}
                    className="text-sm bg-amber-500/20 hover:bg-amber-500/40 px-3 py-1.5 rounded-full text-amber-300 transition-colors shadow flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <div className="space-y-3 overflow-y-auto flex-grow max-h-[340px]">
                  {events.length === 0 && (
                    <div className="text-center py-8 text-slate-600">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No events scheduled</p>
                    </div>
                  )}
                  {events.map(evt => (
                    <div key={evt.id} className={`bg-black/20 p-4 rounded-2xl border transition-all ${
                      evt.notified ? 'border-white/5 opacity-50' : 'border-amber-500/30'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="text-sm font-bold text-amber-300 whitespace-nowrap">
                              {formatEventDatetime(evt.datetime)}
                            </span>
                            {evt.notified && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 font-bold">Done</span>
                            )}
                          </div>
                          <p className="text-sm text-white font-medium truncate">{evt.label}</p>
                          {evt.sound_file && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                              <Music className="w-3 h-3" /> {evt.sound_file.split('/').pop()}
                            </p>
                          )}
                        </div>
                        <button onClick={() => deleteEvent(evt.id)} className="text-xs text-red-400 hover:text-red-300 ml-2 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </GlassPanel>
        </div>

        {/* ── Center Column: Media Hub ──────────────────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassPanel className="h-full flex flex-col">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Radio className="w-5 h-5 text-blue-400" /> Web Radio
            </h3>

            <div className="flex-grow flex flex-col items-center justify-center">
              <div className="aspect-square w-full max-w-[200px] mx-auto bg-gradient-to-br from-indigo-900 to-purple-900 rounded-[2.5rem] mb-8 flex items-center justify-center relative overflow-hidden group shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),0_10px_20px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                {isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 border-2 border-white/20 rounded-full animate-ping" />
                  </div>
                )}
                <Radio className={`w-20 h-20 text-white/80 transition-transform duration-500 ${isPlaying ? 'scale-110' : ''}`} />
                {isPlaying && (
                  <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
                  </div>
                )}
              </div>

              <div className="w-full">
                <div className="flex items-center justify-between mb-8 px-2 bg-black/20 p-2 rounded-2xl border border-white/5">
                  <button onClick={prevRadio} className="p-2 bg-white/5 rounded-full hover:bg-white/20 transition-all text-white/70">
                    <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <div className="text-center mx-2 flex-grow min-w-0">
                    <h4 className="text-xl font-bold truncate">{currentRadio.name}</h4>
                    <p className="text-blue-300 text-xs mt-1 truncate uppercase tracking-widest font-bold">{currentRadio.location}</p>
                  </div>
                  <button onClick={nextRadio} className="p-2 bg-white/5 rounded-full hover:bg-white/20 transition-all text-white/70">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-6 mt-auto">
              <button
                onClick={handlePlayToggle}
                className={`p-5 rounded-full transition-all border shadow-xl transform hover:-translate-y-1 text-white flex items-center justify-center w-[80px] h-[80px] ${isPlaying ? 'bg-indigo-600 border-indigo-400' : 'bg-blue-600 border-blue-400'}`}
              >
                {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current translate-x-1" />}
              </button>
            </div>
          </GlassPanel>

          {/* Songs Module */}
          <GlassPanel className="flex flex-col border border-purple-500/30">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-purple-400" /> Songs Library
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Select Track</label>
                <select
                  value={selectedSong}
                  onChange={e => { setSelectedSong(e.target.value); setIsSongPlaying(false); }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:border-purple-500"
                >
                  {songs.map(s => <option key={s} value={s}>{s}</option>)}
                  {songs.length === 0 && <option value="">No songs found</option>}
                </select>
              </div>
              <div className="flex justify-between items-center bg-black/20 p-2 rounded-2xl border border-white/5">
                <button
                  onClick={handleSongPlayToggle}
                  disabled={!selectedSong}
                  className={`p-3 rounded-full transition-all flex items-center justify-center ${isSongPlaying ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
                >
                  {isSongPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
                </button>
                {isSongPlaying && (
                  <div className="flex gap-1 pr-4">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 bg-purple-500 rounded-full animate-bounce" style={{ height: `${16 + d / 20}px`, animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* ── Right Column: Prayer & Upload ─────────────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          <GlassPanel className="relative overflow-hidden group">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-emerald-400" /> Islamic Assistant
            </h3>

            <div className="bg-black/30 rounded-2xl p-5 border border-emerald-500/20 mb-5">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Next Prayer
              </p>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <h4 className="text-4xl font-light tracking-wide text-white capitalize">
                  {nextPrayerName !== 'none' ? nextPrayerName : 'Isha'}
                </h4>
                <span className="text-2xl font-medium text-emerald-300 font-mono">
                  {nextPrayerName !== 'none' && prayers[nextPrayerName.charAt(0).toUpperCase() + nextPrayerName.slice(1)]
                    ? formatPrayerTime(prayers[nextPrayerName.charAt(0).toUpperCase() + nextPrayerName.slice(1)])
                    : '--:--'
                  }
                </span>
              </div>
            </div>

            <div className="space-y-px bg-black/10 rounded-xl p-2 border border-white/5">
              {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(p => (
                <div key={p} className={`flex justify-between text-sm px-3 py-2 rounded-lg transition-colors ${nextPrayerName.toLowerCase() === p.toLowerCase() ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400'}`}>
                  <span>{p}</span><span className="font-mono">{formatPrayerTime(prayers[p])}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setMosqueModalOpen(true)} className="w-full mt-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-sm font-semibold flex items-center justify-center gap-2 text-slate-300">
              <Settings className="w-4 h-4" /> Configure Adhan
            </button>
          </GlassPanel>

          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".mp3,.wav" />
          <GlassPanel
            onClick={() => fileInputRef.current?.click()}
            className="flex-grow flex flex-col justify-center items-center text-center border-dashed border-2 border-white/20 hover:border-blue-400/50 hover:bg-blue-500/5 transition-all cursor-pointer group"
          >
            <div className="p-4 bg-blue-500/10 rounded-full mb-4 group-hover:scale-110 transition-all border border-blue-500/20">
              <UploadCloud className="w-8 h-8 text-blue-400" />
            </div>
            <h4 className="font-bold text-lg mb-1">Local Storage</h4>
            <p className="text-sm text-slate-400 max-w-[200px]">Tap to browse or drop MP3s to the 50GB Pi volume</p>
          </GlassPanel>
        </div>

      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── ADD ALARM MODAL ── */}
      <Modal isOpen={isAlarmModalOpen} onClose={() => { setAlarmModalOpen(false); setAlarmDays(['Mon','Tue','Wed','Thu','Fri']); }} title="New Alarm">
        <form onSubmit={submitAlarm} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Time</label>
            <input name="time" type="time" defaultValue="07:00"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Label</label>
            <input name="label" type="text" placeholder="e.g. Morning Workout"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3 text-slate-300">Repeat Days</label>
            <DayPicker selected={alarmDays} onChange={setAlarmDays} />
            {alarmDays.length === 0 && (
              <p className="text-xs text-amber-400 mt-2">⚠ No days selected — alarm will ring once only</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300 flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-400" /> Ringtone
            </label>
            <select name="sound_file"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            >
              <option value="">(None — TTS only)</option>
              {musicFiles.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <button type="submit"
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-600/30 flex justify-center items-center gap-2 mt-2"
          >
            <Plus className="w-5 h-5" /> Save Alarm
          </button>
        </form>
      </Modal>

      {/* ── ADD EVENT MODAL ── */}
      <Modal isOpen={isEventModalOpen} onClose={() => { setEventModalOpen(false); setEventForm({ date: '', time: '', label: '', sound_file: '' }); }} title="New Event">
        <form onSubmit={submitEvent} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Date
              </label>
              <input
                type="date"
                value={eventForm.date}
                onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Time
              </label>
              <input
                type="time"
                value={eventForm.time}
                onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Event Description</label>
            <input
              type="text"
              placeholder="e.g. Doctor appointment"
              value={eventForm.label}
              onChange={e => setEventForm({ ...eventForm, label: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300 flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-400" /> Ringtone
            </label>
            <select
              value={eventForm.sound_file}
              onChange={e => setEventForm({ ...eventForm, sound_file: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            >
              <option value="">(None — no sound)</option>
              {musicFiles.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <button type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-600/30 flex justify-center items-center gap-2 mt-2"
          >
            <CalendarClock className="w-5 h-5" /> Save Event
          </button>
        </form>
      </Modal>

      {/* ── MOSQUE CONFIG MODAL ── */}
      <Modal isOpen={isMosqueModalOpen} onClose={() => setMosqueModalOpen(false)} title="Configure Adhan Output">
        <div className="space-y-4 text-center">
          <MapPin className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
          <h4 className="text-xl font-bold">Prayer Synchronization</h4>
          <p className="text-sm text-slate-400">Search for a mosque to sync with Mawaqit, or set local Adhan tracks.</p>

          <div className="flex justify-center mt-4">
            <button
              onClick={scanNearestMosques}
              disabled={isSyncingMawaqit}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-3 rounded-xl text-sm font-bold border border-emerald-500 transition-colors"
            >
              {isSyncingMawaqit ? 'Scanning...' : 'Scan Nearest Mosques'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-32 overflow-y-auto bg-slate-800 border border-slate-600 rounded-xl text-left mt-2">
              {searchResults.map(m => (
                <div key={m.uuid} onClick={() => handleMosqueSelect(m)}
                  className="p-3 border-b border-slate-700 hover:bg-slate-700 cursor-pointer text-sm font-medium">
                  {m.name || 'Unknown Mosque'}
                </div>
              ))}
            </div>
          )}

          {selectedMosque && (
            <div className="text-sm text-emerald-400 font-bold mt-2 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              Synced with: {selectedMosque.name}
            </div>
          )}

          <div className="space-y-3 mt-4 text-left max-h-48 overflow-y-auto pr-2">
            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
              <div key={prayer}>
                <label className="block text-sm font-bold text-slate-300 mt-2">{prayer} Adhan Track</label>
                <select
                  value={adhanSettings[prayer]}
                  onChange={e => setAdhanSettings({ ...adhanSettings, [prayer]: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm"
                >
                  <option value="">Default Backend Adhan</option>
                  {musicFiles.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>

          <button onClick={saveMawaqitConfig}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg mt-6"
          >
            Apply Configuration
          </button>
        </div>
      </Modal>

    </div>
  );
}

export default App;
