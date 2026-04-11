from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import subprocess
import threading

app = FastAPI(title="Mony Hub")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Audio state ─────────────────────────────────────────────────────────────
current_process: Optional[subprocess.Popen] = None
process_lock = threading.Lock()

RADIO_STATIONS = {
    "quran":  ("Quran Kareem Radio", "http://n0a.radiojar.com/8s5u5tpdtwzuv"),
    "radio9090": ("Radio 9090 FM",   "https://9090streaming.mobtada.com/9090FMEGYPT"),
    "bbc":    ("BBC Arabic",          "http://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio"),
}

SONGS_DIR = "/sounds/songs"
INTRO_DIR = "/sounds/intro"

def kill_current():
    """Stop whatever is playing right now."""
    global current_process
    with process_lock:
        if current_process and current_process.poll() is None:
            current_process.terminate()
            try:
                current_process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                current_process.kill()
        current_process = None

def play_file_bg(path: str):
    """Play a local mp3/wav in background via VLC (non-root user)."""
    global current_process
    kill_current()
    cmd = ["cvlc", "--play-and-exit", "--quiet", path]
    with process_lock:
        current_process = subprocess.Popen(
            cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

def stream_radio_bg(url: str):
    """Stream internet radio via VLC in background."""
    global current_process
    kill_current()
    cmd = ["cvlc", "--quiet", url]
    with process_lock:
        current_process = subprocess.Popen(
            cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

# ── Models ───────────────────────────────────────────────────────────────────
class RadioRequest(BaseModel):
    station_id: str
    action: str  # play | stop

class SongRequest(BaseModel):
    filename: str
    action: str  # play | stop

class VolumeRequest(BaseModel):
    level: int  # 0-100

# ── API Routes ───────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/test_speaker")
def test_speaker():
    """Play the first intro sound, or a TTS beep."""
    files = []
    if os.path.exists(INTRO_DIR):
        files = [f for f in os.listdir(INTRO_DIR) if f.endswith(('.mp3', '.wav'))]
    if files:
        threading.Thread(target=play_file_bg,
                         args=(os.path.join(INTRO_DIR, files[0]),)).start()
    else:
        # fallback: espeak TTS
        def _speak():
            kill_current()
            subprocess.run(["espeak-ng", "Mony is online!"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        threading.Thread(target=_speak).start()
    return {"status": "ok"}

@app.get("/api/stations")
def list_stations():
    return [{"id": k, "name": v[0], "url": v[1]} for k, v in RADIO_STATIONS.items()]

@app.post("/api/radio")
def radio_control(req: RadioRequest):
    if req.action == "stop":
        kill_current()
        return {"status": "stopped"}
    if req.station_id not in RADIO_STATIONS:
        raise HTTPException(status_code=404, detail="Station not found")
    _, url = RADIO_STATIONS[req.station_id]
    threading.Thread(target=stream_radio_bg, args=(url,)).start()
    return {"status": "playing", "station": RADIO_STATIONS[req.station_id][0]}

@app.get("/api/songs")
def list_songs():
    if not os.path.exists(SONGS_DIR):
        return []
    return sorted([f for f in os.listdir(SONGS_DIR)
                   if f.endswith(('.mp3', '.wav'))])

@app.post("/api/songs/play")
def play_song(req: SongRequest):
    if req.action == "stop":
        kill_current()
        return {"status": "stopped"}
    safe = os.path.basename(req.filename)   # prevent path traversal
    path = os.path.join(SONGS_DIR, safe)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    threading.Thread(target=play_file_bg, args=(path,)).start()
    return {"status": "playing", "file": safe}

@app.get("/api/volume")
def get_volume():
    try:
        res = subprocess.run(["amixer", "sget", "PCM"],
                             capture_output=True, text=True)
        import re
        m = re.search(r'\[(\d+)%\]', res.stdout)
        if m:
            return {"level": int(m.group(1))}
    except Exception:
        pass
    return {"level": 50}

@app.post("/api/volume")
def set_volume(req: VolumeRequest):
    level = max(0, min(100, req.level))
    subprocess.run(["amixer", "sset", "PCM", f"{level}%"],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"status": "ok", "level": level}

@app.post("/api/stop")
def stop_all():
    kill_current()
    return {"status": "stopped"}

# ── Serve frontend (static HTML built locally, copied in) ───────────────────
STATIC_DIR = "/app/static"
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
