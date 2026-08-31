import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Music, Radio, Sun, Moon, UploadCloud,
  Play, Pause, Mic2, Activity, Volume2, X, Plus,
  Trash2, CalendarClock, Calendar, Clock, AlarmCheck, RefreshCw, Settings,
  BookOpen, Dumbbell, Gamepad2, Thermometer, Lightbulb, Home, User
} from 'lucide-react';
import axios from 'axios';

// ── Utilities ─────────────────────────────────────────────────────────────────
const GlassPanel = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white/22 backdrop-blur-glass border-[1.5px] border-white/55 shadow-[0_8px_32px_0_rgba(0,31,63,0.25)] rounded-[22px] p-6 text-white transition-all duration-300 ${className}`}
  >
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
            ? 'bg-dory-blue border-dory-blue/50 text-white shadow-[0_0_10px_rgba(13,112,234,0.4)]'
            : 'bg-white/5 border-white/10 text-slate-300 hover:border-dory-blue/50 hover:text-white'
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
          active.includes(d) ? 'bg-dory-blue/30 text-dory-blue font-semibold' : 'text-slate-500'
        }`}>{d.slice(0, 1)}</span>
      ))}
    </div>
  );
};

// ── Workout GIF Animations (powered by ExerciseGymGifsDB CDN) ─────────────────
const EXERCISE_GIFS = {
  squat:    'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/jump-squat.gif',
  pushup:   'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/push-up.gif',
  plank:    'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/kneeling-plank-tap-shoulder-male.gif',
  dip:      'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/triceps/triceps-dip.gif',
  jack:     'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/star-jump-male.gif',
  cardio:   'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/jack-jump-male.gif',
  default:  'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/run.gif',
};

const WorkoutAnimation = ({ exerciseName }) => {
  const name = (exerciseName || '').toLowerCase();
  const [failed, setFailed] = React.useState(false);

  let gifUrl = EXERCISE_GIFS.default;
  let fallbackEmoji = '🏃';

  if (name.includes('squat'))                                          { gifUrl = EXERCISE_GIFS.squat;  fallbackEmoji = '🏋️'; }
  else if (name.includes('push') || name.includes('press'))           { gifUrl = EXERCISE_GIFS.pushup; fallbackEmoji = '💪'; }
  else if (name.includes('plank'))                                     { gifUrl = EXERCISE_GIFS.plank;  fallbackEmoji = '🧘'; }
  else if (name.includes('dip') || name.includes('tricep'))           { gifUrl = EXERCISE_GIFS.dip;    fallbackEmoji = '💪'; }
  else if (name.includes('jack') || name.includes('jumping'))         { gifUrl = EXERCISE_GIFS.jack;   fallbackEmoji = '⭐'; }
  else if (name.includes('cardio') || name.includes('run') || name.includes('high knees')) { gifUrl = EXERCISE_GIFS.cardio; fallbackEmoji = '🏃'; }

  if (failed) {
    return (
      <div className="w-36 h-36 flex items-center justify-center text-7xl mx-auto">
        {fallbackEmoji}
      </div>
    );
  }

  return (
    <img
      src={gifUrl}
      alt={exerciseName}
      className="w-40 h-40 mx-auto rounded-2xl object-cover border-2 border-white/20 shadow-[0_0_20px_rgba(13,112,234,0.4)]"
      onError={() => setFailed(true)}
    />
  );
};

// ── DorySvg mascot ─────────────────────────────────────────────────────────────
const DorySvg = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 100 80" className={className}>
    {/* Tail (yellow) */}
    <path d="M70 40 L95 20 L90 40 L95 60 Z" fill="#FFD13B" stroke="#b48b00" strokeWidth="1.5" />
    {/* Body (blue) */}
    <ellipse cx="45" cy="40" rx="30" ry="25" fill="#0D70EA" stroke="#003163" strokeWidth="2" />
    {/* Black markings */}
    <path d="M30 25 C45 20, 55 30, 60 25 C65 20, 68 25, 70 30 C55 35, 45 30, 30 25 Z" fill="#1A1A1A" />
    {/* Eye (white + black) */}
    <circle cx="28" cy="32" r="7" fill="white" />
    <circle cx="27" cy="32" r="3.5" fill="#1A1A1A" />
    <circle cx="25" cy="30" r="1" fill="white" />
    {/* Fin (yellow & blue) */}
    <path d="M45 48 C42 55, 48 60, 52 52 C50 48, 46 47, 45 48 Z" fill="#FFD13B" stroke="#b48b00" strokeWidth="1" />
  </svg>
);


// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [time, setTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [radioIndex, setRadioIndex] = useState(0);

  const [alarms, setAlarms] = useState([]);
  const [events, setEvents] = useState([]);
  const [musicFiles, setMusicFiles] = useState([]);

  const [leftTab, setLeftTab] = useState('alarms');
  const [activeTab, setActiveTab] = useState('home'); // Dory theme defaults to home

  const [isAlarmModalOpen, setAlarmModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);

  // Alarm/Event state
  const [alarmDays, setAlarmDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [eventForm, setEventForm] = useState({ date: '', time: '', label: '', sound_file: '', use_tts: false, tts_text: '' });

  // Dory Smart Lights State
  const [lights, setLights] = useState({ livingRoom: false, kitchen: false });

  // Downloader Status state
  const [downloadStatus, setDownloadStatus] = useState({
    status: 'idle',
    progress: 0,
    current_file: null,
    downloaded_files: [],
    total_files: 6,
    errors: []
  });

  // Prayer times from backend
  const [prayers, setPrayers] = useState({});
  const [isSyncingPrayers, setIsSyncingPrayers] = useState(false);

  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState('');
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  const [selectedDhikr, setSelectedDhikr] = useState('');
  const [isDhikrPlaying, setIsDhikrPlaying] = useState(false);
  const [workoutStatus, setWorkoutStatus] = useState('idle'); // idle | active | rest | completed
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [workoutCategory, setWorkoutCategory] = useState('All'); // All | Upper | Lower | Core | Cardio
  const workoutIntervalRef = useRef(null);
  
  // Kids Corner states
  const [kidsGame, setKidsGame] = useState(null); // null | math | memory | paint | phonics
  const [mathState, setMathState] = useState({ num1: 0, num2: 0, options: [], answer: 0, score: 0, total: 0 });
  const [memoryCards, setMemoryCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [paintColor, setPaintColor] = useState('#8b5cf6');
  const [paintBrushSize, setPaintBrushSize] = useState(5);

  const [isSyncingMawaqit, setIsSyncingMawaqit] = useState(false);
  const [volume, setVolume] = useState(50);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMosque, setSelectedMosque] = useState(null);
  const [adhanSettings, setAdhanSettings] = useState({
    Fajr: '', Dhuhr: '', Asr: '', Maghrib: '', Isha: ''
  });
  const [isMosqueModalOpen, setMosqueModalOpen] = useState(false);

  // Toast state
  const [activeToast, setActiveToast] = useState(null);

  const fileInputRef = useRef(null);
  
  // Voice Recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState('');
  const [recordingName, setRecordingName] = useState('');
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  const radioStations = [
    { name: 'Quran Kareem Radio (Cairo)', location: 'Cairo, Egypt', url: 'https://n03.radiojar.com/8s5u5tpdtwzuv' },
    { name: 'Quran Kareem Radio 2 (Cairo)', location: 'Cairo, Egypt', url: 'http://n0a.radiojar.com/8s5u5tpdtwzuv' },
    { name: 'Radio 9090 FM', location: 'Cairo, Egypt', url: 'https://9090streaming.mobtada.com/9090FMEGYPT' },
    { name: 'BBC Arabic', location: 'London, UK', url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio' },
  ];

  const currentRadio = radioStations[radioIndex];

  // ── Clock: synced to Pi server time ─────────────────────────────────────────
  const serverOffsetMs = useRef(0); // Pi time minus browser time
  useEffect(() => {
    // Fetch server time once, compute offset, then tick locally
    const syncClock = async () => {
      try {
        const before = Date.now();
        const res = await axios.get('/api/time');
        const after = Date.now();
        const rtt = after - before;
        const serverMs = res.data.unix * 1000;
        // Compensate for half the round-trip latency
        serverOffsetMs.current = serverMs - before - rtt / 2;
      } catch { /* keep zero offset */ }
    };
    syncClock();
    // Re-sync every 5 minutes to drift-correct
    const syncTimer = setInterval(syncClock, 5 * 60 * 1000);
    // Tick every second using the cached offset
    const tickTimer = setInterval(() => {
      setTime(new Date(Date.now() + serverOffsetMs.current));
    }, 1000);
    return () => { clearInterval(syncTimer); clearInterval(tickTimer); };
  }, []);

  // ── Initial fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAlarms();
    fetchEvents();
    fetchMusic();
    fetchSongs();
    fetchVolume();
    fetchPrayers();
    fetchMawaqitSettings();
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

  const fetchPrayers = async () => {
    try {
      const r = await axios.get('/api/prayers');
      setPrayers(r.data);
    } catch { }
  };

  const syncPrayers = async () => {
    setIsSyncingPrayers(true);
    try {
      await axios.post('/api/prayers/sync');
      // Poll until we get data (sync runs asynchronously)
      let retries = 10;
      while (retries-- > 0) {
        await new Promise(r => setTimeout(r, 3000));
        const res = await axios.get('/api/prayers');
        if (Object.keys(res.data).length > 0) {
          setPrayers(res.data);
          break;
        }
      }
    } catch { }
    setIsSyncingPrayers(false);
  };

  // Determine next upcoming prayer
  const getNextPrayer = () => {
    const now = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const order = ['Fajr', 'Shuruq', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (const p of order) {
      if (prayers[p] && prayers[p] > now) return p;
    }
    return order[0]; // wrap to Fajr next day
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

  const startRecording = async () => {
    setAudioBlobUrl('');
    setRecordingName('');
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      alert('Microphone access denied or not supported on this browser/device.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const saveRecording = async () => {
    if (audioChunksRef.current.length === 0) return;
    setIsSavingRecording(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const filename = (recordingName.trim() || `recording_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_') + '.webm';
    
    const fd = new FormData();
    fd.append('file', audioBlob, filename);
    try {
      await axios.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAudioBlobUrl('');
      setRecordingName('');
      alert('Recording saved to library!');
      fetchMusic();
      fetchSongs();
    } catch (err) {
      console.error('Save recording failed', err);
      alert('Failed to save voice recording.');
    }
    setIsSavingRecording(false);
  };

  const [isDownloadingResources, setIsDownloadingResources] = useState(false);
  const downloadIntervalRef = useRef(null);

  const fetchDownloadStatus = async () => {
    try {
      const res = await axios.get('/api/download_status');
      setDownloadStatus(res.data);
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        clearInterval(downloadIntervalRef.current);
        setIsDownloadingResources(false);
        fetchMusic();
        fetchSongs();
      } else if (res.data.status === 'downloading') {
        setIsDownloadingResources(true);
      }
    } catch (err) {
      console.error('Failed to fetch download status', err);
    }
  };

  const downloadResources = async () => {
    setIsDownloadingResources(true);
    try {
      await axios.post('/api/download_resources');
      clearInterval(downloadIntervalRef.current);
      downloadIntervalRef.current = setInterval(fetchDownloadStatus, 2000);
    } catch (err) {
      console.error('Failed to trigger download', err);
      alert('Failed to start download.');
      setIsDownloadingResources(false);
    }
  };

  useEffect(() => {
    fetchDownloadStatus();
    const checkOnMount = async () => {
      try {
        const res = await axios.get('/api/download_status');
        if (res.data.status === 'downloading') {
          setIsDownloadingResources(true);
          downloadIntervalRef.current = setInterval(fetchDownloadStatus, 2000);
        }
      } catch {}
    };
    checkOnMount();
    return () => clearInterval(downloadIntervalRef.current);
  }, []);

  const workouts = {
    Upper: [
      { name: 'Push-ups', duration: 30, desc: 'Keep your back straight and push up from the floor.', muscles: 'Chest, Arms' },
      { name: 'Tricep Dips', duration: 30, desc: 'Use a chair or bench to dip and lift your hips.', muscles: 'Triceps, Shoulders' },
      { name: 'Arm Circles', duration: 30, desc: 'Extend arms straight out and spin in small circles.', muscles: 'Shoulders' }
    ],
    Lower: [
      { name: 'Bodyweight Squats', duration: 30, desc: 'Lower your hips back and down, keep chest up.', muscles: 'Quads, Glutes' },
      { name: 'Lunges', duration: 30, desc: 'Step forward and bend both knees to 90 degrees.', muscles: 'Hamstrings, Calves' },
      { name: 'Glute Bridges', duration: 30, desc: 'Lie on your back, raise hips towards ceiling.', muscles: 'Glutes, Lower Back' }
    ],
    Core: [
      { name: 'Abdominal Crunches', duration: 30, desc: 'Curl shoulders up, keeping lower back on floor.', muscles: 'Abs' },
      { name: 'Forearm Plank', duration: 30, desc: 'Hold straight body line resting on elbows.', muscles: 'Core' },
      { name: 'Russian Twists', duration: 30, desc: 'Sit and twist torso side to side, optional lift feet.', muscles: 'Obliques' }
    ],
    Cardio: [
      { name: 'Jumping Jacks', duration: 30, desc: 'Jump feet out and raise hands, then return.', muscles: 'Cardio, Full Body' },
      { name: 'High Knees', duration: 30, desc: 'Run in place bringing knees up to hip height.', muscles: 'Cardio, Legs' },
      { name: 'Burpees', duration: 40, desc: 'Squat, kick back, push up, jump up to clap.', muscles: 'Cardio, Strength' }
    ]
  };

  const getActiveWorkouts = () => {
    if (workoutCategory === 'All') {
      return [...workouts.Upper, ...workouts.Lower, ...workouts.Core, ...workouts.Cardio];
    }
    return workouts[workoutCategory] || [];
  };

  const speakAlert = async (text) => {
    try {
      await axios.post('/api/tts', { text });
    } catch (e) {
      console.error('TTS Alert failed:', e);
    }
  };

  const startWorkout = () => {
    const list = getActiveWorkouts();
    if (list.length === 0) return;
    clearInterval(workoutIntervalRef.current);
    
    setWorkoutStatus('active');
    setCurrentExerciseIndex(0);
    const firstEx = list[0];
    setWorkoutTimer(firstEx.duration);
    speakAlert(`Starting workout category ${workoutCategory}. First exercise is ${firstEx.name}. Go!`);

    workoutIntervalRef.current = setInterval(() => {
      setWorkoutTimer(prev => {
        if (prev <= 1) {
          clearInterval(workoutIntervalRef.current);
          handleWorkoutTransition();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleWorkoutTransition = () => {
    const list = getActiveWorkouts();
    const isLast = currentExerciseIndex >= list.length - 1;
    if (isLast) {
      setWorkoutStatus('completed');
      speakAlert('Workout complete! Excellent job!');
    } else {
      setWorkoutStatus('rest');
      setWorkoutTimer(15);
      speakAlert(`Rest for 15 seconds. Next up is ${list[currentExerciseIndex + 1].name}`);
      
      workoutIntervalRef.current = setInterval(() => {
        setWorkoutTimer(p => {
          if (p <= 1) {
            clearInterval(workoutIntervalRef.current);
            // Switch to next active exercise
            setWorkoutStatus('active');
            const nextIndex = currentExerciseIndex + 1;
            setCurrentExerciseIndex(nextIndex);
            const nextEx = list[nextIndex];
            setWorkoutTimer(nextEx.duration);
            speakAlert(`Starting ${nextEx.name}. Go!`);
            
            // Restart interval
            workoutIntervalRef.current = setInterval(() => {
              setWorkoutTimer(t => {
                if (t <= 1) {
                  clearInterval(workoutIntervalRef.current);
                  handleWorkoutTransition();
                  return 0;
                }
                return t - 1;
              });
            }, 1000);
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    }
  };

  const pauseWorkout = () => {
    clearInterval(workoutIntervalRef.current);
    setWorkoutStatus('idle');
  };

  const resetWorkout = () => {
    clearInterval(workoutIntervalRef.current);
    setWorkoutStatus('idle');
    setCurrentExerciseIndex(0);
    setWorkoutTimer(0);
  };

  // Kids Corner handlers
  const startMathQuiz = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    const options = new Set([answer]);
    while (options.size < 4) {
      options.add(Math.floor(Math.random() * 20) + 1);
    }
    setMathState(prev => ({
      ...prev,
      num1,
      num2,
      answer,
      options: Array.from(options).sort(() => Math.random() - 0.5)
    }));
  };

  const answerMath = (selected) => {
    const isCorrect = selected === mathState.answer;
    if (isCorrect) {
      speakAlert('Correct! Well done!');
      setMathState(prev => ({ ...prev, score: prev.score + 1, total: prev.total + 1 }));
    } else {
      speakAlert(`Incorrect. The correct answer was ${mathState.answer}`);
      setMathState(prev => ({ ...prev, total: prev.total + 1 }));
    }
    setTimeout(startMathQuiz, 1500);
  };

  const memoryEmojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];
  const startMemoryGame = () => {
    const doubled = [...memoryEmojis, ...memoryEmojis].map((e, idx) => ({
      id: idx,
      emoji: e,
      isFlipped: false,
      isMatched: false
    }));
    setMemoryCards(doubled.sort(() => Math.random() - 0.5));
    setSelectedCards([]);
    setMemoryMoves(0);
  };

  const handleCardClick = (card) => {
    if (card.isFlipped || card.isMatched || selectedCards.length >= 2) return;

    const updated = memoryCards.map(c => c.id === card.id ? { ...c, isFlipped: true } : c);
    setMemoryCards(updated);

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMemoryMoves(m => m + 1);
      const [c1, c2] = newSelected;
      if (c1.emoji === c2.emoji) {
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isMatched: true } : c));
          setSelectedCards([]);
          speakAlert('Match found!');
        }, 600);
      } else {
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isFlipped: false } : c));
          setSelectedCards([]);
        }, 1200);
      }
    }
  };

  const triggerPhonics = (letter) => {
    const words = {
      A: 'A is for Apple', B: 'B is for Balloon', C: 'C is for Cat', D: 'D is for Dog',
      E: 'E is for Elephant', F: 'F is for Fish', G: 'G is for Grapes', H: 'H is for Horse',
      I: 'I is for Igloo', J: 'J is for Jellyfish', K: 'K is for Kangaroo', L: 'L is for Lion',
      M: 'M is for Monkey', N: 'N is for Nest', O: 'O is for Orange', P: 'P is for Penguin',
      Q: 'Q is for Queen', R: 'R is for Rainbow', S: 'S is for Sun', T: 'T is for Tiger',
      U: 'U is for Umbrella', V: 'V is for Violin', W: 'W is for Watermelon', X: 'X is for Xylophone',
      Y: 'Y is for Yak', Z: 'Z is for Zebra'
    };
    speakAlert(words[letter] || `${letter}`);
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
        use_tts: fd.get('use_tts') === 'true',
        tts_text: fd.get('tts_text') || null,
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
        use_tts: eventForm.use_tts || false,
        tts_text: eventForm.tts_text || null,
      });
      setEventModalOpen(false);
      setEventForm({ date: '', time: '', label: '', sound_file: '', use_tts: false, tts_text: '' });
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

  const renderDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full w-full items-stretch">
      {/* Left Column (Span 3) */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        {/* Room Temperature Widget */}
        <GlassPanel className="flex items-center gap-4 bg-reef-coral/25 border-reef-coral/40 shadow-[0_8px_32px_0_rgba(255,107,87,0.25)] rounded-[26px]">
          <div className="p-4 bg-white/20 rounded-2xl border border-white/30 text-white">
            <Thermometer className="w-10 h-10 animate-pulse" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-ice-blue">Room Temp</h4>
            <p className="text-4xl font-black text-white">22°C</p>
          </div>
        </GlassPanel>

        {/* Family Calendar / Schedule list */}
        <GlassPanel className="flex-grow flex flex-col bg-dory-yellow/20 border-dory-yellow/45 shadow-[0_8px_32px_0_rgba(255,209,59,0.2)] rounded-[26px] max-h-[48vh] overflow-hidden">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-left">
            <Calendar className="w-4 h-4 text-white" /> Family Schedule
          </h3>
          <div className="space-y-3 flex-grow overflow-y-auto pr-1 text-left">
            {events.filter(e => !e.notified).length === 0 && (
              <p className="text-xs text-white/70 py-6 text-center">No upcoming events scheduled.</p>
            )}
            {events.filter(e => !e.notified).map(evt => (
              <div key={evt.id} className="p-3 bg-white/10 rounded-xl border border-white/15 text-xs">
                <div className="flex justify-between items-center text-white font-bold mb-1">
                  <span>{formatEventDatetime(evt.datetime)}</span>
                </div>
                <p className="font-semibold text-white truncate">{evt.label}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* Center Hero Column (Span 6) */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        {/* Framed Cartoon Portrait centerpiece with Dory overlay */}
        <GlassPanel className="flex-grow flex flex-col items-center justify-center p-5 border-[6px] border-reef-coral/95 relative overflow-hidden bg-cover bg-center rounded-[32px] min-h-[300px] shadow-[0_12px_40px_0_rgba(255,107,87,0.4)]">
          {/* Overlay to darken slightly for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10 z-0 pointer-events-none" />
          
          {/* Main cartoon portrait image - Galata Tower family selfie */}
          <img
            src="/family.jpg"
            alt="Family Portrait centerpiece"
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          {/* Floating animated Dory mascot sticker */}
          <div className="absolute bottom-4 right-4 z-20 animate-bounce" style={{ animationDuration: '3s' }}>
            <DorySvg className="w-20 h-20 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
          </div>

          <div className="relative z-10 mt-auto text-center">
            <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
              Dory - Family Hub
            </h2>
            <p className="text-sm text-dory-yellow font-black mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </GlassPanel>

        {/* Media Control Player */}
        <GlassPanel className="flex flex-col bg-dory-blue/25 border-dory-blue/40 shadow-[0_8px_32px_0_rgba(13,112,234,0.3)] rounded-[26px]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
              <div className="p-3 bg-dory-yellow/20 rounded-2xl text-dory-yellow flex-shrink-0 animate-spin-slow">
                <Music className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-ice-blue uppercase tracking-widest text-[10px]">Now Playing</h4>
                <p className="text-base font-bold text-white truncate">{isPlaying ? currentRadio.name : (isSongPlaying ? selectedSong : 'No media playing')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={isPlaying ? handlePlayToggle : (selectedSong ? handleSongPlayToggle : null)}
                className="p-4 bg-dory-yellow text-slate-900 rounded-full hover:bg-dory-yellow/80 transition-colors shadow-lg"
              >
                {(isPlaying || isSongPlaying) ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
              </button>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Right Column (Span 3) */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        {/* User Profile tile */}
        <GlassPanel className="flex items-center gap-3 bg-dory-yellow/20 border-dory-yellow/45 shadow-[0_8px_32px_0_rgba(255,209,59,0.2)] rounded-[26px]">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white flex-shrink-0 bg-cover bg-center animate-pulse" style={{ backgroundImage: 'url("/family.jpg")' }} />
          <div className="text-left">
            <h4 className="text-xs font-bold text-ice-blue">Active Profile</h4>
            <p className="text-base font-bold text-white truncate">Dory Family</p>
          </div>
        </GlassPanel>

        {/* Smart Lights IoT Control */}
        <GlassPanel className="flex flex-col bg-dory-blue/25 border-dory-blue/40 shadow-[0_8px_32px_0_rgba(13,112,234,0.3)] rounded-[26px] text-left">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-dory-yellow animate-pulse" /> Smart Lights
          </h3>
          <div className="space-y-3">
            {[
              { id: 'livingRoom', label: 'Living Room' },
              { id: 'kitchen', label: 'Kitchen' }
            ].map(l => (
              <div key={l.id} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-sm font-semibold">{l.label}</span>
                <button
                  onClick={() => setLights({ ...lights, [l.id]: !lights[l.id] })}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 border ${
                    lights[l.id] ? 'bg-[#2ECC71] border-[#2ECC71]' : 'bg-slate-700 border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${lights[l.id] ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Quick Photo Album Previews */}
        <GlassPanel className="flex-grow flex flex-col bg-reef-coral/25 border-reef-coral/40 shadow-[0_8px_32px_0_rgba(255,107,87,0.25)] rounded-[26px] text-left max-h-[25vh] overflow-hidden">
          <h3 className="text-sm font-bold text-ice-blue mb-2">Photo Previews</h3>
          <div className="grid grid-cols-2 gap-2 flex-grow overflow-hidden">
            <div className="bg-cover bg-center rounded-xl border border-white/10 shadow" style={{ backgroundImage: 'url("/family.jpg")' }} />
            <div className="bg-cover bg-center rounded-xl border border-white/10 shadow" style={{ backgroundImage: 'url("/nemo_reef.png")' }} />
          </div>
        </GlassPanel>
      </div>
    </div>
  );

  const renderReminders = () => (
    <div className="flex-grow flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-2xl">
        <div className="flex gap-2">
          <button
            onClick={() => setLeftTab('alarms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              leftTab === 'alarms'
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" /> Alarms
          </button>
          <button
            onClick={() => setLeftTab('events')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              leftTab === 'events'
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarClock className="w-4 h-4" /> Events
          </button>
        </div>
        <button
          onClick={() => leftTab === 'alarms' ? setAlarmModalOpen(true) : setEventModalOpen(true)}
          className="text-sm bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl text-white font-bold transition-all shadow flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add {leftTab === 'alarms' ? 'Alarm' : 'Event'}
        </button>
      </div>

      {leftTab === 'alarms' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[70vh] w-full">
          {alarms.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-500">
              <AlarmCheck className="w-16 h-16 mx-auto mb-4 opacity-40 text-purple-400" />
              <p className="text-lg font-bold">No Alarms Set</p>
              <p className="text-sm">Click "Add Alarm" to create one.</p>
            </div>
          )}
          {alarms.map(alarm => (
            <div
              key={alarm.id}
              className={`bg-white/5 p-5 rounded-3xl border transition-all ${
                alarm.active ? 'border-purple-500/50' : 'border-white/5 opacity-55'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-3xl font-black tracking-tight">{alarm.time}</h4>
                    {alarm.use_tts ? (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">🗣 TTS</span>
                    ) : alarm.sound_file ? (
                      <Music className="w-3.5 h-3.5 text-purple-400" />
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-300 font-semibold mt-1">{alarm.label}</p>
                  {alarm.use_tts && alarm.tts_text && (
                    <p className="text-xs text-slate-400 italic mt-1 font-mono truncate max-w-[200px]">"{alarm.tts_text}"</p>
                  )}
                  {alarm.sound_file && (
                    <p className="text-xs text-purple-300 mt-1 truncate max-w-[200px]">🎵 {alarm.sound_file.split('/').pop()}</p>
                  )}
                  <DayBadges days={alarm.days} />
                </div>
                <div className="flex flex-col items-end gap-4">
                  <div
                    onClick={() => toggleAlarm(alarm.id)}
                    className={`w-11 h-6 ${alarm.active ? 'bg-purple-500' : 'bg-slate-700'} rounded-full relative cursor-pointer transition-colors`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${alarm.active ? 'right-1' : 'left-1'}`} />
                  </div>
                  <button onClick={() => deleteAlarm(alarm.id)} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 font-bold">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[70vh] w-full">
          {events.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-40 text-amber-400" />
              <p className="text-lg font-bold">No Events Scheduled</p>
              <p className="text-sm">Click "Add Event" to create one.</p>
            </div>
          )}
          {events.map(evt => (
            <div key={evt.id} className={`bg-white/5 p-5 rounded-3xl border transition-all ${
              evt.notified ? 'border-white/5 opacity-55' : 'border-amber-500/30'
            }`}>
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">
                      {formatEventDatetime(evt.datetime)}
                    </span>
                    {evt.notified && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-bold">Done</span>
                    )}
                    {evt.use_tts && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full">🗣 TTS</span>
                    )}
                  </div>
                  <p className="text-base text-white font-semibold truncate">{evt.label}</p>
                  {evt.use_tts && evt.tts_text && (
                    <p className="text-xs text-slate-400 italic mt-1 font-mono truncate">"{evt.tts_text}"</p>
                  )}
                  {evt.sound_file && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                      <Music className="w-3.5 h-3.5" /> {evt.sound_file.split('/').pop()}
                    </p>
                  )}
                </div>
                <button onClick={() => deleteEvent(evt.id)} className="text-sm text-red-400 hover:text-red-300 ml-4 font-bold flex items-center gap-1">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMedia = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow overflow-y-auto max-h-[80vh] pr-2 w-full">
      {/* Web Radio Station List */}
      <GlassPanel className="flex flex-col border border-blue-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-blue-400" /> Live Web Radio
        </h3>
        <div className="space-y-3 flex-grow overflow-y-auto max-h-60 mb-4 bg-black/20 p-2 rounded-2xl border border-white/5">
          {radioStations.map((station, idx) => (
            <button
              key={station.name}
              onClick={() => { setRadioIndex(idx); setIsPlaying(false); }}
              className={`w-full text-left p-3 rounded-xl transition-all border flex justify-between items-center ${
                radioIndex === idx
                  ? 'bg-blue-600/35 border-blue-500/50 text-white'
                  : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10'
              }`}
            >
              <div>
                <p className="font-bold text-sm">{station.name}</p>
                <p className="text-xs text-slate-400">{station.location}</p>
              </div>
              {radioIndex === idx && isPlaying && (
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </button>
          ))}
        </div>
        <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center flex flex-col justify-center mb-4">
          <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">Now Tuning</p>
          <h4 className="font-bold text-base truncate mt-1">{currentRadio.name}</h4>
        </div>
        <div className="flex justify-center">
          <button
            onClick={handlePlayToggle}
            className={`p-4 rounded-full transition-all border shadow-lg transform hover:-translate-y-0.5 text-white flex items-center justify-center w-[60px] h-[60px] ${isPlaying ? 'bg-indigo-600 border-indigo-400' : 'bg-blue-600 border-blue-400'}`}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
          </button>
        </div>
      </GlassPanel>

      {/* Songs Library */}
      <GlassPanel className="flex flex-col border border-purple-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-purple-400" /> Songs Library
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Select Track</label>
            <select
              value={selectedSong}
              onChange={e => { setSelectedSong(e.target.value); setIsSongPlaying(false); }}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-purple-500"
            >
              {songs.map(s => <option key={s} value={s}>{s}</option>)}
              {songs.length === 0 && <option value="">No songs found</option>}
            </select>
          </div>
          <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-2xl border border-white/5">
            <button
              onClick={handleSongPlayToggle}
              disabled={!selectedSong}
              className={`p-3 rounded-full transition-all flex items-center justify-center ${isSongPlaying ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
            >
              {isSongPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
            </button>
            {isSongPlaying && (
              <div className="flex gap-1 pr-4">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1 bg-purple-500 rounded-full animate-bounce" style={{ height: `${12 + d / 30}px`, animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".mp3,.wav" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 border border-dashed border-white/20 rounded-2xl hover:border-purple-500 hover:bg-purple-500/5 transition-all text-sm font-bold text-slate-300"
          >
            <UploadCloud className="w-4 h-4 text-purple-400" /> Upload Local MP3s
          </button>
        </div>
      </GlassPanel>

      {/* Voice Recorder (col-span-full) */}
      <GlassPanel className="lg:col-span-2 flex flex-col border border-indigo-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Mic2 className="w-5 h-5 text-indigo-400" /> Voice Recording Studio
        </h3>
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-around bg-black/20 p-5 rounded-3xl border border-white/5">
          <div className="flex flex-col items-center gap-2">
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="w-16 h-16 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all animate-pulse"
              >
                <div className="w-6 h-6 bg-white rounded" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all"
              >
                <Mic2 className="w-7 h-7" />
              </button>
            )}
            <span className="text-xs font-bold text-slate-400">
              {isRecording ? `Recording... (${recordingTime}s)` : 'Tap to Record'}
            </span>
          </div>

          {audioBlobUrl && (
            <div className="flex-1 max-w-sm space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 w-full">
              <audio src={audioBlobUrl} controls className="w-full h-8" />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Give it a name"
                  value={recordingName}
                  onChange={e => setRecordingName(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={saveRecording}
                  disabled={isSavingRecording}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs disabled:opacity-50"
                >
                  {isSavingRecording ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );

  const handleDhikrPlayToggle = async (file) => {
    const isSame = selectedDhikr === file;
    const nextPlaying = isSame ? !isDhikrPlaying : true;
    
    setSelectedDhikr(file);
    setIsDhikrPlaying(nextPlaying);
    
    try {
      await axios.post('/api/songs/play', { 
        filename: file, 
        action: nextPlaying ? 'play' : 'pause' 
      });
    } catch { }
  };

  const renderDhikr = () => {
    const adhkarFiles = musicFiles.filter(f => f.startsWith('Adhkar/'));
    const hadithFiles = musicFiles.filter(f => f.startsWith('Hadith/'));

    const expectedFiles = [
      { category: 'Adhkar', name: 'Morning_Adhkar.mp3', label: 'Morning Adhkar' },
      { category: 'Adhkar', name: 'Evening_Adhkar.mp3', label: 'Evening Adhkar' },
      { category: 'Adhkar', name: 'Before_Sleep.mp3', label: 'Sleep Supplications' },
      { category: 'Hadith', name: 'Hadith_1.mp3', label: 'Nawawi Hadith 1' },
      { category: 'Hadith', name: 'Hadith_2.mp3', label: 'Nawawi Hadith 2' },
      { category: 'Hadith', name: 'Hadith_3.mp3', label: 'Nawawi Hadith 3' },
    ];

    const isDone = (filename) => {
      const list = musicFiles || [];
      const downloaded = (downloadStatus && downloadStatus.downloaded_files) || [];
      return list.some(f => f && typeof f === 'string' && f.split('/').pop() === filename) || 
             downloaded.includes(filename);
    };

    // Per-file status from backend
    const fileStatuses = (downloadStatus && downloadStatus.file_statuses) || {};
    const getFileIcon = (filename) => {
      const st = fileStatuses[filename];
      if (st === 'done') return { icon: '✅', color: 'text-green-400' };
      if (st === 'failed') return { icon: '❌', color: 'text-red-400' };
      if (st === 'downloading') return { icon: '⏳', color: 'text-yellow-400 animate-pulse' };
      return { icon: '⬜', color: 'text-slate-500' };
    };
    const hasFailures = downloadStatus && (downloadStatus.failed_files || []).length > 0;
    const allDone = downloadStatus && downloadStatus.status === 'completed';
    const isPartial = downloadStatus && downloadStatus.status === 'partial';

    return (
      <div className="flex flex-col gap-4 w-full h-full max-h-[80vh] overflow-y-auto pr-1">
        {/* Downloader HUD */}
        <GlassPanel className="border border-dory-blue/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-left">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                  <path d="M12 3v13M7 11l5 5 5-5" stroke="#0D70EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 21h14" stroke="#0D70EA" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Audio Resources Manager
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {allDone && 'All files downloaded successfully!'}
                {isPartial && `Downloaded with errors — ${(downloadStatus.failed_files||[]).length} file(s) failed`}
                {!allDone && !isPartial && 'Download Adhkar & Hadith audio for offline use.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadResources}
                disabled={isDownloadingResources}
                className={`text-sm font-bold px-6 py-2.5 rounded-full shadow transition-all ${
                  isDownloadingResources
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-dory-blue text-white hover:bg-dory-blue/80'
                }`}
              >
                {isDownloadingResources ? 'Downloading...' : (allDone ? 'Re-Download' : 'Download Library')}
              </button>
              {hasFailures && !isDownloadingResources && (
                <button
                  onClick={downloadResources}
                  className="text-sm font-bold px-4 py-2.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all"
                >
                  Retry Failed
                </button>
              )}
            </div>
          </div>

          {/* Always-visible per-file status grid */}
          <div className="mt-4 bg-black/30 p-4 rounded-[18px] border border-white/5 text-left">
            {/* Progress bar — only shown while downloading */}
            {isDownloadingResources && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-dory-yellow truncate">
                    {downloadStatus?.current_file ? `Fetching: ${downloadStatus.current_file}` : 'Starting...'}
                  </span>
                  <span className="text-xs font-black text-white">{downloadStatus?.progress || 0}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-dory-yellow h-2 rounded-full transition-all duration-500"
                    style={{ width: `${downloadStatus?.progress || 0}%` }}
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {expectedFiles.map(f => {
                const { icon, color } = getFileIcon(f.name);
                const done = isDone(f.name);
                return (
                  <div key={f.name} className={`flex items-center gap-2 text-xs p-2 rounded-xl ${
                    done ? 'bg-green-500/10 border border-green-500/20' :
                    fileStatuses[f.name] === 'failed' ? 'bg-red-500/10 border border-red-500/20' :
                    fileStatuses[f.name] === 'downloading' ? 'bg-yellow-500/10 border border-yellow-500/20 animate-pulse' :
                    'bg-white/5 border border-white/5'
                  }`}>
                    <span className={`text-base ${color}`}>{icon}</span>
                    <span className={done ? 'text-slate-200' : fileStatuses[f.name] === 'failed' ? 'text-red-300' : 'text-slate-500'}>
                      {f.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {(downloadStatus?.errors || []).length > 0 && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-xs font-bold text-red-400 mb-1">Errors:</p>
                {(downloadStatus.errors || []).map((e, i) => (
                  <p key={i} className="text-[10px] text-red-300 truncate">{e}</p>
                ))}
              </div>
            )}
          </div>
        </GlassPanel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Adhkar Section */}
          <GlassPanel className="flex flex-col border border-dory-blue/20">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-left">
              <span className="text-2xl">🤲</span> Fortress of the Muslim (Adhkar)
            </h3>
            <div className="space-y-2 flex-grow overflow-y-auto max-h-60 bg-black/20 p-2.5 rounded-[22px] border border-white/5">
              {adhkarFiles.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-8">Library empty. Click "Download Library" to download audio packs.</p>
              )}
              {adhkarFiles.map(f => {
                const name = f.split('/').pop().replace('.mp3', '').replace(/_/g, ' ');
                const isCurrent = selectedDhikr === f;
                return (
                  <div key={f} className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-transparent hover:border-dory-blue/20 transition-all">
                    <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">{name}</span>
                    <button
                      onClick={() => handleDhikrPlayToggle(f)}
                      className={`p-2 rounded-full transition-colors ${
                        isCurrent && isDhikrPlaying ? 'bg-dory-blue text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {isCurrent && isDhikrPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          {/* Hadith Section */}
          <GlassPanel className="flex flex-col border border-reef-coral/20">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-left">
              <BookOpen className="w-5 h-5 text-reef-coral" /> An-Nawawi's 40 Hadith
            </h3>
            <div className="space-y-2 flex-grow overflow-y-auto max-h-60 bg-black/20 p-2.5 rounded-[22px] border border-white/5">
              {hadithFiles.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-8">Library empty. Download using button on the left.</p>
              )}
              {hadithFiles.map(f => {
                const name = f.split('/').pop().replace('.mp3', '').replace(/_/g, ' ');
                const isCurrent = selectedDhikr === f;
                return (
                  <div key={f} className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-transparent hover:border-reef-coral/20 transition-all">
                    <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">{name}</span>
                    <button
                      onClick={() => handleDhikrPlayToggle(f)}
                      className={`p-2 rounded-full transition-colors ${
                        isCurrent && isDhikrPlaying ? 'bg-reef-coral text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {isCurrent && isDhikrPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      </div>
    );
  };

  const renderWorkout = () => {
    const list = getActiveWorkouts();
    const activeEx = list[currentExerciseIndex];

    return (
      <div className="flex-grow flex flex-col gap-6 w-full">
        {workoutStatus === 'idle' || workoutStatus === 'completed' ? (
          <>
            {/* Category Selectors */}
            <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-[22px]">
              <div className="flex gap-2 overflow-x-auto">
                {['All', 'Upper', 'Lower', 'Core', 'Cardio'].map(c => (
                  <button
                    key={c}
                    onClick={() => setWorkoutCategory(c)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      workoutCategory === c
                        ? 'bg-dory-blue/30 text-ice-blue border border-dory-blue/40 shadow-lg'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                onClick={startWorkout}
                className="bg-dory-blue hover:bg-dory-blue/80 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-1.5 text-sm"
              >
                <Play className="w-4 h-4 fill-current" /> Start Workout
              </button>
            </div>

            {workoutStatus === 'completed' && (
              <div className="p-6 bg-dory-blue/10 border border-dory-blue/20 rounded-[22px] text-center">
                <span className="text-4xl">🎉</span>
                <h4 className="text-xl font-bold text-white mt-2">Workout Completed!</h4>
                <p className="text-sm text-slate-300 mt-1">Excellent job! You did fantastic.</p>
              </div>
            )}

            {/* Exercises List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[60vh] pr-2">
              {list.map((ex, idx) => (
                <div key={idx} className="bg-white/5 p-5 rounded-[22px] border border-white/5 flex gap-4 items-start hover:border-dory-blue/20 transition-all">
                  <div className="w-12 h-12 bg-dory-blue/20 border border-dory-blue/30 rounded-2xl flex items-center justify-center flex-shrink-0 text-dory-blue font-black text-lg">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-base text-white truncate">{ex.name}</h4>
                      <span className="text-[10px] bg-dory-blue/20 text-ice-blue font-bold px-2 py-0.5 rounded-full flex-shrink-0">{ex.duration}s</span>
                    </div>
                    <p className="text-xs text-dory-yellow font-semibold mt-0.5">{ex.muscles}</p>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{ex.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <GlassPanel className="flex flex-col md:flex-row border border-dory-blue/30 items-center justify-around p-8 flex-grow gap-8">
            {/* Visual Animation Column */}
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs font-bold uppercase tracking-widest text-dory-yellow mb-4">
                {workoutStatus === 'active' ? 'Active Exercise' : 'Rest Cycle'}
              </span>
              
              {/* Animated stick figure */}
              <div className="w-48 h-48 bg-black/20 rounded-full border border-white/10 flex items-center justify-center shadow-inner mb-4">
                {workoutStatus === 'active' ? (
                  <WorkoutAnimation exerciseName={activeEx.name} />
                ) : (
                  <span className="text-6xl animate-bounce">🧘</span>
                )}
              </div>
              
              <h3 className="text-3xl font-black text-white">{workoutStatus === 'active' ? activeEx.name : 'Take a Breath'}</h3>
              <p className="text-sm text-dory-yellow mt-1">{workoutStatus === 'active' ? activeEx.muscles : 'Get ready'}</p>
            </div>

            {/* Timer Column */}
            <div className="flex flex-col items-center flex-1">
              {/* Timer visual circle */}
              <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
                <svg className="absolute w-full h-full -rotate-90">
                  <circle
                    cx="96" cy="96" r="80"
                    className="stroke-slate-800" strokeWidth="8" fill="none"
                  />
                  <circle
                    cx="96" cy="96" r="80"
                    className={workoutStatus === 'active' ? 'stroke-dory-blue' : 'stroke-reef-coral'}
                    strokeWidth="8" fill="none"
                    strokeDasharray="502"
                    strokeDashoffset={502 - (502 * workoutTimer) / (workoutStatus === 'active' ? activeEx.duration : 15)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="flex flex-col">
                  <span className="text-5xl font-black text-white tracking-tighter">{workoutTimer}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">seconds</span>
                </div>
              </div>

              {workoutStatus === 'active' ? (
                <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-6 italic">"{activeEx.desc}"</p>
              ) : (
                <div className="mb-6 text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Next Up:</p>
                  <p className="text-lg font-bold text-white mt-1">{list[currentExerciseIndex + 1]?.name || 'Finishing'}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={pauseWorkout}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
                >
                  Pause
                </button>
                <button
                  onClick={resetWorkout}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 text-red-300 font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
                >
                  Reset
                </button>
              </div>
            </div>
          </GlassPanel>
        )}
      </div>
    );
  };

  const renderKids = () => {
    if (kidsGame === 'math') {
      return (
        <div className="flex-grow flex flex-col gap-6 w-full">
          <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-2xl">
            <h3 className="text-xl font-bold flex items-center gap-2">🎈 Math Quiz</h3>
            <button
              onClick={() => setKidsGame(null)}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-3 py-1.5 rounded-full"
            >
              Back to Games
            </button>
          </div>
          <GlassPanel className="flex flex-col items-center justify-center text-center p-8 flex-grow border border-purple-500/20">
            <div className="flex justify-between w-full mb-6 max-w-sm">
              <span className="text-sm font-bold text-slate-400">Score: {mathState.score}</span>
              <span className="text-sm font-bold text-slate-400">Total: {mathState.total}</span>
            </div>
            {mathState.options.length === 0 ? (
              <button
                onClick={startMathQuiz}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-2xl text-lg transition-all shadow-lg shadow-purple-600/30"
              >
                Start Math Quiz!
              </button>
            ) : (
              <>
                <h4 className="text-6xl font-black text-white tracking-tighter mb-10">
                  {mathState.num1} + {mathState.num2} = ?
                </h4>
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  {mathState.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => answerMath(opt)}
                      className="bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 text-2xl font-bold py-5 rounded-2xl transition-all"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </GlassPanel>
        </div>
      );
    }

    if (kidsGame === 'memory') {
      return (
        <div className="flex-grow flex flex-col gap-6 w-full">
          <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-2xl">
            <h3 className="text-xl font-bold flex items-center gap-2">🐶 Match Emojis</h3>
            <div className="flex gap-4 items-center">
              <span className="text-xs font-bold text-slate-400">Moves: {memoryMoves}</span>
              <button
                onClick={() => setKidsGame(null)}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-3 py-1.5 rounded-full"
              >
                Back
              </button>
            </div>
          </div>
          <GlassPanel className="flex flex-col items-center justify-center p-6 flex-grow border border-purple-500/20">
            {memoryCards.length === 0 ? (
              <button
                onClick={startMemoryGame}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-2xl text-lg transition-all"
              >
                Start Memory Match!
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-3 w-full max-w-sm">
                {memoryCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className={`aspect-square rounded-2xl text-3xl flex items-center justify-center border transition-all ${
                      card.isFlipped || card.isMatched
                        ? 'bg-purple-500/20 border-purple-500/40'
                        : 'bg-white/5 border-white/10 hover:border-purple-500/30'
                    }`}
                  >
                    {card.isFlipped || card.isMatched ? card.emoji : '❓'}
                  </button>
                ))}
              </div>
            )}
          </GlassPanel>
        </div>
      );
    }

    if (kidsGame === 'paint') {
      return <PaintGame onBack={() => setKidsGame(null)} />;
    }

    if (kidsGame === 'phonics') {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      return (
        <div className="flex-grow flex flex-col gap-6 w-full">
          <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-2xl">
            <h3 className="text-xl font-bold flex items-center gap-2">🗣 Phonics Soundboard</h3>
            <button
              onClick={() => setKidsGame(null)}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-3 py-1.5 rounded-full"
            >
              Back
            </button>
          </div>
          <GlassPanel className="flex flex-col p-6 flex-grow border border-purple-500/20">
            <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-widest text-center">Tap a letter to hear its sound!</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-3 justify-center max-h-[50vh] overflow-y-auto pr-2">
              {alphabet.map(letter => (
                <button
                  key={letter}
                  onClick={() => triggerPhonics(letter)}
                  className="aspect-square bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 rounded-2xl font-black text-2xl text-slate-200 transition-all flex items-center justify-center"
                >
                  {letter}
                </button>
              ))}
            </div>
          </GlassPanel>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 w-full">
        <GlassPanel
          onClick={async () => {
            try {
              await axios.post('/api/launch_gcompris');
            } catch (err) {
              alert('Failed to launch GCompris: ' + (err.response?.data?.message || err.message));
            }
          }}
          className="flex flex-col md:flex-row items-center justify-between cursor-pointer hover:border-dory-yellow/40 hover:bg-dory-blue/5 border border-white/10 p-6 group"
        >
          <div className="flex items-center gap-4 text-left">
            <span className="text-5xl group-hover:scale-110 transition-transform">🚀</span>
            <div>
              <h4 className="text-xl font-bold text-white">GCompris Educational Suite</h4>
              <p className="text-xs text-slate-300 mt-1">Click to launch the complete offline collection of 140+ educational activities!</p>
            </div>
          </div>
          <span className="mt-4 md:mt-0 px-6 py-2.5 bg-dory-blue text-white rounded-full font-bold text-sm shadow hover:bg-dory-blue/80 transition-colors">
            Launch App
          </span>
        </GlassPanel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow w-full">
          <GlassPanel
            onClick={() => { setKidsGame('math'); startMathQuiz(); }}
            className="flex flex-col items-center justify-center text-center cursor-pointer hover:border-dory-blue/40 hover:bg-dory-blue/5 transition-all p-8 group border border-white/10"
          >
            <span className="text-5xl group-hover:scale-110 transition-transform">🎈</span>
            <h4 className="text-lg font-bold text-white mt-4">Math Quiz</h4>
            <p className="text-xs text-slate-400 mt-1">Practice addition and subtraction sums!</p>
          </GlassPanel>

          <GlassPanel
            onClick={() => { setKidsGame('memory'); startMemoryGame(); }}
            className="flex flex-col items-center justify-center text-center cursor-pointer hover:border-dory-blue/40 hover:bg-dory-blue/5 transition-all p-8 group border border-white/10"
          >
            <span className="text-5xl group-hover:scale-110 transition-transform">🐹</span>
            <h4 className="text-lg font-bold text-white mt-4">Memory Match</h4>
            <p className="text-xs text-slate-400 mt-1">Match pairs of animal emoji cards!</p>
          </GlassPanel>

          <GlassPanel
            onClick={() => setKidsGame('paint')}
            className="flex flex-col items-center justify-center text-center cursor-pointer hover:border-dory-blue/40 hover:bg-dory-blue/5 transition-all p-8 group border border-white/10"
          >
            <span className="text-5xl group-hover:scale-110 transition-transform">🎨</span>
            <h4 className="text-lg font-bold text-white mt-4">Painting Board</h4>
            <p className="text-xs text-slate-400 mt-1">Draw and paint with colors on screen!</p>
          </GlassPanel>

          <GlassPanel
            onClick={() => setKidsGame('phonics')}
            className="flex flex-col items-center justify-center text-center cursor-pointer hover:border-dory-blue/40 hover:bg-dory-blue/5 transition-all p-8 group border border-white/10"
          >
            <span className="text-5xl group-hover:scale-110 transition-transform">🗣</span>
            <h4 className="text-lg font-bold text-white mt-4">Phonics Soundboard</h4>
            <p className="text-xs text-slate-400 mt-1">Learn alphabet spelling sounds!</p>
          </GlassPanel>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch flex-grow">
        {/* Settings Left Menu */}
        <aside className="lg:w-56 flex flex-row lg:flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded-[22px] justify-between lg:justify-start flex-wrap flex-shrink-0">
          <button
            onClick={() => setLeftTab('alarms')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              leftTab === 'alarms' ? 'bg-dory-blue text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            ⏰ Alarms & Events
          </button>
          <button
            onClick={() => setLeftTab('voice')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              leftTab === 'voice' ? 'bg-dory-blue text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            🎙 Voice Recorder
          </button>
          <button
            onClick={() => setLeftTab('media')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              leftTab === 'media' ? 'bg-dory-blue text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            🎵 Media & Songs
          </button>
          <button
            onClick={() => setLeftTab('mosque')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              leftTab === 'mosque' ? 'bg-dory-blue text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            🕌 Mosque Setup
          </button>
        </aside>

        {/* Settings Right panel */}
        <div className="flex-grow flex flex-col min-w-0">
          {leftTab === 'alarms' && renderReminders()}
          {leftTab === 'voice' && (
            <div className="flex flex-col gap-6 w-full text-left">
              <GlassPanel className="border border-dory-blue/20">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <Mic2 className="w-5 h-5 text-dory-blue" /> Voice Recording Studio
                </h3>
                <div className="flex flex-col sm:flex-row gap-6 items-center justify-around bg-black/20 p-5 rounded-[22px] border border-white/5">
                  <div className="flex flex-col items-center gap-2">
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-16 h-16 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all animate-pulse"
                      >
                        <div className="w-6 h-6 bg-white rounded" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-16 h-16 bg-dory-blue hover:bg-dory-blue/80 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                      >
                        <Mic2 className="w-7 h-7" />
                      </button>
                    )}
                    <span className="text-xs font-bold text-slate-400">
                      {isRecording ? `Recording... (${recordingTime}s)` : 'Tap to Record'}
                    </span>
                  </div>

                  {audioBlobUrl && (
                    <div className="flex-1 max-w-sm space-y-3 bg-white/5 p-4 rounded-xl border border-white/10 w-full">
                      <audio src={audioBlobUrl} controls className="w-full h-8" />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Give it a name"
                          value={recordingName}
                          onChange={e => setRecordingName(e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-dory-blue"
                        />
                        <button
                          onClick={saveRecording}
                          disabled={isSavingRecording}
                          className="px-4 py-1.5 bg-dory-blue text-white rounded-xl text-xs font-bold shadow hover:bg-dory-blue/80 transition-all flex items-center gap-1"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </div>
          )}
          {leftTab === 'media' && renderMedia()}
          {leftTab === 'mosque' && (
            <div className="flex flex-col gap-6 w-full text-left">
              <GlassPanel className="border border-dory-blue/20">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                  <div className="text-left">
                    <h3 className="text-xl font-bold">Mosque Prayer Sync</h3>
                    <p className="text-xs text-slate-300 mt-1">Sync local prayer times from your local mosque using Mawaqit slug.</p>
                  </div>
                  <button
                    onClick={syncPrayers}
                    disabled={isSyncingPrayers}
                    className="bg-dory-blue hover:bg-dory-blue/80 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all"
                  >
                    Sync Times Now
                  </button>
                </div>

                {/* Configure Mosque button */}
                <div className="flex flex-col items-start gap-4">
                  <button
                    onClick={() => setMosqueModalOpen(true)}
                    className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all"
                  >
                    Configure Mosque Slug & Adhans
                  </button>
                  {selectedMosque && (
                    <p className="text-sm text-dory-yellow">Selected: <strong>{selectedMosque.name}</strong></p>
                  )}
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen text-slate-100 p-2 pb-20 flex flex-col font-sans relative overflow-hidden"
      style={{
        backgroundImage: 'url("/nemo_reef.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/60 to-slate-900/40 z-0 pointer-events-none" />

      {/* Ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-dory-blue/20 blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-reef-coral/15 blur-[150px] pointer-events-none z-0" />

      {/* Toast */}
      {activeToast && (
        <Toast event={activeToast} onDismiss={() => setActiveToast(null)} />
      )}

      {/* Header */}
      <header className="flex justify-between items-center mb-8 relative z-10 w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-dory-blue/20 rounded-2xl border border-dory-blue/30">
            <Activity className="text-dory-blue w-8 h-8" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              Dory - Family Hub
            </h1>
            <p className="text-sm text-ice-blue font-semibold">Smart Touchscreen Kiosk</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/10 border border-white/20 px-4 py-2 rounded-xl shadow-inner backdrop-blur-md">
            <Volume2 className="w-4 h-4 text-slate-200" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={e => setVolume(e.target.value)}
              onMouseUp={e => setSystemVolume(e.target.value)}
              onTouchEnd={e => setSystemVolume(e.target.value)}
              className="w-24 accent-dory-blue cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-200 w-6 text-right">
              {volume}%
            </span>
          </div>

          <button
            onClick={testSpeaker}
            className="flex items-center bg-white/15 hover:bg-white/25 transition-colors px-4 py-2 rounded-xl text-sm border border-white/25 text-white font-bold backdrop-blur-md"
          >
            <Volume2 className="w-4 h-4 mr-2" /> Test Speaker
          </button>

          <div className="bg-white/15 border border-white/25 px-4 py-2 rounded-xl flex items-center justify-center backdrop-blur-md font-bold text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2ECC71] animate-pulse" />
            <span className="ml-2">Online</span>
          </div>
        </div>
      </header>

      {/* Main Container with Tab Route */}
      <div className="flex flex-col relative z-10 w-full max-w-6xl mx-auto flex-grow items-stretch">
        <main className="flex-grow flex flex-col min-w-0 pb-6">
          {activeTab === 'home' && renderDashboard()}
          {activeTab === 'islamic' && renderDhikr()}
          {activeTab === 'workout' && renderWorkout()}
          {activeTab === 'kids' && renderKids()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>

      {/* Floating Bottom Navigation Dock — colorful inline SVG icons */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-xl border border-white/20 px-4 py-2.5 rounded-full flex gap-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
        {[
          {
            id: 'home', label: 'Home',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M3 12L12 3l9 9" stroke="#60BDFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 21V12h6v9" stroke="#60BDFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 10v11h14V10" stroke="#0D70EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )
          },
          {
            id: 'islamic', label: 'Islamic',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M12 2a7 7 0 1 0 7 7 5 5 0 1 1-5-5 7 7 0 0 0-2 0z" fill="#FFD13B" stroke="#FFD13B" strokeWidth="0.5"/>
                <circle cx="17" cy="5" r="1.5" fill="#FFD13B"/>
                <path d="M4 20 Q12 14 20 20" stroke="#2ECC71" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )
          },
          {
            id: 'workout', label: 'Workout',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <rect x="2" y="11" width="4" height="2" rx="1" fill="#FF6B57"/>
                <rect x="18" y="11" width="4" height="2" rx="1" fill="#FF6B57"/>
                <rect x="6" y="8" width="2" height="8" rx="1" fill="#FF6B57"/>
                <rect x="16" y="8" width="2" height="8" rx="1" fill="#FF6B57"/>
                <rect x="8" y="10" width="8" height="4" rx="2" fill="#FF9580"/>
              </svg>
            )
          },
          {
            id: 'kids', label: 'Kids',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <polygon points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,16.5 5.5,21 7.5,13.5 2,9 9,9" fill="#FFD13B" stroke="#FFA000" strokeWidth="0.5"/>
              </svg>
            )
          },
          {
            id: 'settings', label: 'Settings',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <circle cx="12" cy="12" r="3" fill="#94A3B8" stroke="#CBD5E1" strokeWidth="1"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )
          }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-dory-blue/80 text-white shadow-[0_0_16px_rgba(13,112,234,0.6)] scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {t.icon}
            <span className="text-[11px]">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── ADD ALARM MODAL ── */}
      <Modal isOpen={isAlarmModalOpen} onClose={() => { setAlarmModalOpen(false); setAlarmDays(['Mon','Tue','Wed','Thu','Fri']); }} title="New Alarm">
        <form onSubmit={submitAlarm} className="space-y-5 text-left">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Time</label>
            <input name="time" type="time" defaultValue="07:00"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dory-blue focus:ring-1 focus:ring-dory-blue"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Label</label>
            <input name="label" type="text" placeholder="e.g. Morning Workout"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dory-blue focus:ring-1 focus:ring-dory-blue"
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

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="alarm_use_tts"
              name="use_tts"
              value="true"
              className="w-4 h-4 rounded text-dory-blue bg-slate-800 border-slate-600 focus:ring-dory-blue"
            />
            <label htmlFor="alarm_use_tts" className="text-sm font-semibold text-slate-300">
              🗣 Use Text-to-Speech (TTS)
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">TTS Speech Text</label>
            <input
              name="tts_text"
              type="text"
              placeholder="e.g. Rise and shine!"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dory-blue focus:ring-1 focus:ring-dory-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300 flex items-center gap-2">
              <Music className="w-4 h-4 text-dory-yellow" /> Ringtone
            </label>
            <select name="sound_file"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dory-blue focus:ring-1 focus:ring-dory-blue"
            >
              <option value="">(None — TTS only)</option>
              {musicFiles.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <button type="submit"
            className="w-full bg-dory-blue hover:bg-dory-blue/80 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-dory-blue/30 flex justify-center items-center gap-2 mt-2"
          >
            <Plus className="w-5 h-5" /> Save Alarm
          </button>
        </form>
      </Modal>

      {/* ── ADD EVENT MODAL ── */}
      <Modal isOpen={isEventModalOpen} onClose={() => { setEventModalOpen(false); setEventForm({ date: '', time: '', label: '', sound_file: '', use_tts: false, tts_text: '' }); }} title="New Event">
        <form onSubmit={submitEvent} className="space-y-5 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-dory-yellow" /> Date
              </label>
              <input
                type="date"
                value={eventForm.date}
                onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-dory-blue focus:ring-1 focus:ring-dory-blue text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-dory-yellow" /> Time
              </label>
              <input
                type="time"
                value={eventForm.time}
                onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-dory-blue focus:ring-1 focus:ring-dory-blue text-sm"
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
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dory-blue focus:ring-1 focus:ring-dory-blue"
              required
            />
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="event_use_tts"
              checked={eventForm.use_tts || false}
              onChange={e => setEventForm({ ...eventForm, use_tts: e.target.checked })}
              className="w-4 h-4 rounded text-dory-blue bg-slate-800 border-slate-600 focus:ring-dory-blue"
            />
            <label htmlFor="event_use_tts" className="text-sm font-semibold text-slate-300">
              🗣 Use Text-to-Speech (TTS)
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">TTS Speech Text</label>
            <input
              type="text"
              placeholder="e.g. Appointment reminder"
              value={eventForm.tts_text || ''}
              onChange={e => setEventForm({ ...eventForm, tts_text: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dory-blue focus:ring-1 focus:ring-dory-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300 flex items-center gap-2">
              <Music className="w-4 h-4 text-dory-yellow" /> Ringtone
            </label>
            <select
              value={eventForm.sound_file}
              onChange={e => setEventForm({ ...eventForm, sound_file: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dory-blue focus:ring-1 focus:ring-dory-blue"
            >
              <option value="">(None — no sound)</option>
              {musicFiles.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <button type="submit"
            className="w-full bg-dory-blue hover:bg-dory-blue/80 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-dory-blue/30 flex justify-center items-center gap-2 mt-2"
          >
            <CalendarClock className="w-5 h-5" /> Save Event
          </button>
        </form>
      </Modal>

      {/* ── MOSQUE SETTINGS MODAL ── */}
      <Modal isOpen={isMosqueModalOpen} onClose={() => setMosqueModalOpen(false)} title="Mosque & Adhan Settings">
        <div className="space-y-5 text-left">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Find Mosque</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={scanNearestMosques}
                disabled={isSyncingMawaqit}
                className="flex-1 bg-dory-blue hover:bg-dory-blue/80 text-white font-bold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-md"
              >
                {isSyncingMawaqit ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                Scan Nearest Mosques
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 max-h-48 overflow-y-auto space-y-2">
              <p className="text-xs text-slate-400 font-semibold mb-1">Search Results:</p>
              {searchResults.map(m => (
                <button
                  key={m.uuid}
                  type="button"
                  onClick={() => handleMosqueSelect(m)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-dory-blue/30 flex justify-between items-center"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-bold text-slate-200 truncate">{m.name}</p>
                    <p className="text-xs text-slate-400 truncate">{m.city || m.label || 'Unknown city'}</p>
                  </div>
                  <span className="text-[10px] bg-dory-blue/20 text-ice-blue font-bold px-2.5 py-1 rounded-full flex-shrink-0">Select</span>
                </button>
              ))}
            </div>
          )}

          {selectedMosque && (
            <div className="p-4 bg-dory-blue/10 border border-dory-blue/20 rounded-2xl">
              <p className="text-xs text-dory-blue font-bold uppercase tracking-wider">Active Mosque</p>
              <h4 className="font-bold text-lg text-white mt-1">{selectedMosque.name}</h4>
              <p className="text-xs text-slate-400 mt-0.5 truncate">UUID: {selectedMosque.uuid}</p>
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-bold text-slate-300 mb-3">Map Adhan Ringtones</h4>
            <div className="space-y-3">
              {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(p => (
                <div key={p} className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-slate-400 w-16">{p}</span>
                  <select
                    value={adhanSettings[p] || ''}
                    onChange={e => setAdhanSettings({ ...adhanSettings, [p]: e.target.value })}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-dory-blue"
                  >
                    <option value="">(Default Azan)</option>
                    {musicFiles.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={saveMawaqitConfig}
            className="w-full bg-dory-blue hover:bg-dory-blue/80 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-dory-blue/30 flex justify-center items-center gap-2 mt-2"
          >
            Save Settings
          </button>
        </div>
      </Modal>
    </div>
  );
}

const PaintGame = ({ onBack }) => {
  const canvasRef = useRef(null);
  const [paintColor, setPaintColor] = useState('#8b5cf6');
  const [paintBrushSize, setPaintBrushSize] = useState(5);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = paintColor;
    ctx.lineWidth = paintBrushSize;
  }, [paintColor, paintBrushSize]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    isDrawingRef.current = true;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex-grow flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-2xl">
        <h3 className="text-xl font-bold flex items-center gap-2">🎨 Painting Canvas</h3>
        <div className="flex gap-2">
          <button
            onClick={clearCanvas}
            className="text-xs bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 text-red-300 font-bold px-3 py-1.5 rounded-full"
          >
            Clear
          </button>
          <button
            onClick={onBack}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-3 py-1.5 rounded-full"
          >
            Back
          </button>
        </div>
      </div>
      <GlassPanel className="flex flex-col p-4 flex-grow border border-purple-500/20 gap-4">
        {/* Toolbar */}
        <div className="flex items-center gap-4 bg-black/20 p-2.5 rounded-2xl border border-white/5 justify-between">
          <div className="flex gap-2">
            {['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ffffff'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setPaintColor(c)}
                className={`w-6 h-6 rounded-full border ${paintColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Size</span>
            <input
              type="range" min="1" max="20" value={paintBrushSize}
              onChange={e => setPaintBrushSize(parseInt(e.target.value))}
              className="w-20 accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-3xl overflow-hidden border border-white/15 aspect-[4/3] w-full flex-grow relative">
          <canvas
            ref={canvasRef}
            width="600"
            height="450"
            className="w-full h-full block bg-white cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </GlassPanel>
    </div>
  );
};

export default App;
