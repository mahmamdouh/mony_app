from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import subprocess
import threading
import asyncio
import sqlite3
from contextlib import contextmanager, asynccontextmanager
from datetime import datetime


# ── Alarm Scheduler (defined early so lifespan can reference it) ───────────────
async def alarm_scheduler():
    """
    Background task: wakes every minute, fires any active alarm
    whose time matches now AND whose repeat days include today.
    """
    print("Alarm scheduler started")
    while True:
        now = datetime.now()
        current_time = now.strftime("%H:%M")   # e.g. "07:30"
        current_day  = now.strftime("%a")       # e.g. "Mon"

        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                alarms = conn.execute(
                    "SELECT * FROM alarms WHERE active = 1"
                ).fetchall()

            for alarm in alarms:
                alarm = dict(alarm)
                if alarm["time"] != current_time:
                    continue

                # Check weekday — empty days = fire every day
                days_str = alarm.get("days") or ""
                day_list = [d.strip() for d in days_str.split(",") if d.strip()]
                if day_list and current_day not in day_list:
                    continue

                print(f"Alarm firing: '{alarm['label']}' at {current_time}")
                sound = alarm.get("sound_file")
                path  = resolve_sound_path(sound) if sound else None

                if path:
                    threading.Thread(target=play_file_bg, args=(path,), daemon=True).start()
                else:
                    label = alarm.get("label") or "Alarm"
                    def _speak(lbl=label):
                        subprocess.run(["espeak-ng", lbl],
                                       stdout=subprocess.DEVNULL,
                                       stderr=subprocess.DEVNULL)
                    threading.Thread(target=_speak, daemon=True).start()

        except Exception as e:
            print(f"Alarm scheduler error: {e}")

        # Sleep until start of next minute
        await asyncio.sleep(60 - datetime.now().second)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(alarm_scheduler())
    yield
    task.cancel()


app = FastAPI(title="Mony Hub", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Database ─────────────────────────────────────────────────────────────────
DB_PATH = "/data/mony.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS alarms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                time TEXT NOT NULL,
                label TEXT,
                days TEXT,
                sound_file TEXT,
                active BOOLEAN DEFAULT 1
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                datetime TEXT NOT NULL,
                label TEXT,
                sound_file TEXT,
                notified BOOLEAN DEFAULT 0
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS mawaqit_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mosque_uuid TEXT,
                mosque_name TEXT,
                fajr_adhan TEXT,
                dhuhr_adhan TEXT,
                asr_adhan TEXT,
                maghrib_adhan TEXT,
                isha_adhan TEXT
            )
        ''')

    # Graceful column migrations for existing DBs
    migrations = [
        "ALTER TABLE alarms ADD COLUMN sound_file TEXT",
        "ALTER TABLE events ADD COLUMN sound_file TEXT",
        "ALTER TABLE events ADD COLUMN notified BOOLEAN DEFAULT 0",
    ]
    for sql in migrations:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.execute(sql)
        except sqlite3.OperationalError:
            pass  # Column already exists

init_db()

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# ── Audio state ──────────────────────────────────────────────────────────────
current_process: Optional[subprocess.Popen] = None
process_lock = threading.Lock()

SONGS_DIR  = "/sounds/songs"
INTRO_DIR  = "/sounds/intro"
AZAN_DIR   = "/sounds/Azan"
MUSIC_DIR  = "/data/music"

def kill_current():
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
    global current_process
    kill_current()
    cmd = ["cvlc", "--play-and-exit", "--quiet", path]
    with process_lock:
        current_process = subprocess.Popen(
            cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

def stream_radio_bg(url: str):
    global current_process
    kill_current()
    cmd = ["cvlc", "--quiet", url]
    with process_lock:
        current_process = subprocess.Popen(
            cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

def resolve_sound_path(sound_file: str) -> Optional[str]:
    """Resolve a sound_file string (e.g. 'songs/foo.mp3' or 'foo.mp3') to an absolute path."""
    if not sound_file:
        return None
    dir_map = {
        "songs": SONGS_DIR,
        "Azan":  AZAN_DIR,
        "intro": INTRO_DIR,
    }
    if "/" in sound_file:
        folder, fname = sound_file.split("/", 1)
        base = dir_map.get(folder, MUSIC_DIR)
        path = os.path.join(base, fname)
    else:
        path = os.path.join(MUSIC_DIR, sound_file)
        if not os.path.exists(path):
            path = os.path.join(SONGS_DIR, sound_file)
    return path if os.path.exists(path) else None

# ── Models ───────────────────────────────────────────────────────────────────
class RadioRequest(BaseModel):
    url: str
    action: str  # play | pause/stop

class SongPlayRequest(BaseModel):
    filename: str
    action: str  # play | pause/stop

class VolumeRequest(BaseModel):
    level: int  # 0-100

class AlarmModel(BaseModel):
    time: str
    label: str
    days: str
    sound_file: Optional[str] = None
    active: bool = True

class EventModel(BaseModel):
    datetime: str          # "2026-04-22T08:00"
    label: str
    sound_file: Optional[str] = None

class MawaqitSettings(BaseModel):
    mosque_uuid: Optional[str] = None
    mosque_name: Optional[str] = None
    fajr_adhan: Optional[str] = None
    dhuhr_adhan: Optional[str] = None
    asr_adhan: Optional[str] = None
    maghrib_adhan: Optional[str] = None
    isha_adhan: Optional[str] = None

# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok"}

# ── Speaker test ─────────────────────────────────────────────────────────────
@app.get("/api/test_speaker")
def test_speaker():
    files = []
    if os.path.exists(INTRO_DIR):
        files = [f for f in os.listdir(INTRO_DIR) if f.endswith(('.mp3', '.wav'))]
    if files:
        threading.Thread(target=play_file_bg,
                         args=(os.path.join(INTRO_DIR, files[0]),)).start()
    else:
        def _speak():
            kill_current()
            subprocess.run(["espeak-ng", "Mony is online!"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        threading.Thread(target=_speak).start()
    return {"status": "ok"}

# ── Radio ─────────────────────────────────────────────────────────────────────
@app.post("/api/radio")
def radio_control(req: RadioRequest):
    if req.action in ("pause", "stop"):
        kill_current()
        return {"status": "stopped"}
    if req.action == "play" and req.url:
        threading.Thread(target=stream_radio_bg, args=(req.url,)).start()
    return {"status": "ok"}

# ── Music / Songs ─────────────────────────────────────────────────────────────
@app.get("/api/music")
def list_music():
    music_dirs = [MUSIC_DIR, AZAN_DIR, INTRO_DIR, SONGS_DIR]
    files = []
    for d in music_dirs:
        if os.path.exists(d):
            for f in os.listdir(d):
                if f.endswith(('.mp3', '.wav')):
                    label = f"{os.path.basename(d)}/{f}" if d != MUSIC_DIR else f
                    files.append(label)
    return files

@app.get("/api/songs")
def list_songs():
    if not os.path.exists(SONGS_DIR):
        return []
    return sorted([f for f in os.listdir(SONGS_DIR) if f.endswith(('.mp3', '.wav'))])

@app.post("/api/songs/play")
def play_song(req: SongPlayRequest):
    if req.action in ("pause", "stop"):
        kill_current()
        return {"status": "stopped"}
    path = resolve_sound_path(req.filename)
    if not path:
        raise HTTPException(status_code=404, detail="File not found")
    threading.Thread(target=play_file_bg, args=(path,)).start()
    return {"status": "playing", "file": req.filename}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    os.makedirs(MUSIC_DIR, exist_ok=True)
    dest = os.path.join(MUSIC_DIR, file.filename)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return {"info": f"Saved '{file.filename}'"}

# ── Volume ────────────────────────────────────────────────────────────────────
@app.get("/api/volume")
def get_volume():
    try:
        import re
        res = subprocess.run(["amixer", "sget", "PCM"], capture_output=True, text=True)
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

# ── Alarms ────────────────────────────────────────────────────────────────────
@app.get("/api/alarms")
def get_alarms():
    with get_db() as db:
        return [dict(r) for r in db.execute("SELECT * FROM alarms ORDER BY time").fetchall()]

@app.post("/api/alarms")
def add_alarm(alarm: AlarmModel):
    with get_db() as db:
        db.execute(
            "INSERT INTO alarms (time, label, days, sound_file, active) VALUES (?, ?, ?, ?, ?)",
            (alarm.time, alarm.label, alarm.days, alarm.sound_file, alarm.active)
        )
        db.commit()
    return {"status": "ok"}

@app.delete("/api/alarms/{alarm_id}")
def delete_alarm(alarm_id: int):
    with get_db() as db:
        db.execute("DELETE FROM alarms WHERE id = ?", (alarm_id,))
        db.commit()
    return {"status": "ok"}

@app.patch("/api/alarms/{alarm_id}/toggle")
def toggle_alarm(alarm_id: int):
    with get_db() as db:
        db.execute("UPDATE alarms SET active = NOT active WHERE id = ?", (alarm_id,))
        db.commit()
    return {"status": "ok"}

# ── Events ────────────────────────────────────────────────────────────────────
@app.get("/api/events")
def get_events():
    with get_db() as db:
        return [dict(r) for r in db.execute(
            "SELECT * FROM events ORDER BY datetime ASC"
        ).fetchall()]

@app.post("/api/events")
def add_event(event: EventModel):
    with get_db() as db:
        db.execute(
            "INSERT INTO events (datetime, label, sound_file, notified) VALUES (?, ?, ?, 0)",
            (event.datetime, event.label, event.sound_file)
        )
        db.commit()
    return {"status": "ok"}

@app.delete("/api/events/{event_id}")
def delete_event(event_id: int):
    with get_db() as db:
        db.execute("DELETE FROM events WHERE id = ?", (event_id,))
        db.commit()
    return {"status": "ok"}

@app.get("/api/events/due")
def get_due_events():
    """Events whose datetime falls within the current minute, not yet notified."""
    current_minute = datetime.now().strftime("%Y-%m-%dT%H:%M")
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM events WHERE datetime LIKE ? AND notified = 0",
            (f"{current_minute}%",)
        ).fetchall()
        due = [dict(r) for r in rows]
        if due:
            ids = ",".join(str(r["id"]) for r in due)
            db.execute(f"UPDATE events SET notified = 1 WHERE id IN ({ids})")
            db.commit()
    return due

# ── Mawaqit ───────────────────────────────────────────────────────────────────
@app.get("/api/mawaqit/settings")
def get_mawaqit_settings():
    with get_db() as db:
        res = db.execute("SELECT * FROM mawaqit_settings ORDER BY id DESC LIMIT 1").fetchone()
        return dict(res) if res else {}

@app.post("/api/mawaqit/settings")
def save_mawaqit_settings(settings: MawaqitSettings):
    with get_db() as db:
        res = db.execute("SELECT id FROM mawaqit_settings ORDER BY id DESC LIMIT 1").fetchone()
        if res:
            db.execute('''
                UPDATE mawaqit_settings
                SET mosque_uuid=?, mosque_name=?, fajr_adhan=?, dhuhr_adhan=?,
                    asr_adhan=?, maghrib_adhan=?, isha_adhan=?
                WHERE id=?
            ''', (settings.mosque_uuid, settings.mosque_name,
                  settings.fajr_adhan, settings.dhuhr_adhan,
                  settings.asr_adhan, settings.maghrib_adhan,
                  settings.isha_adhan, res['id']))
        else:
            db.execute('''
                INSERT INTO mawaqit_settings
                (mosque_uuid, mosque_name, fajr_adhan, dhuhr_adhan, asr_adhan, maghrib_adhan, isha_adhan)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (settings.mosque_uuid, settings.mosque_name,
                  settings.fajr_adhan, settings.dhuhr_adhan,
                  settings.asr_adhan, settings.maghrib_adhan,
                  settings.isha_adhan))
        db.commit()
    return {"status": "ok"}

@app.get("/api/mawaqit/scan")
async def scan_nearest_mosques():
    try:
        import requests
        from mawaqit import AsyncMawaqitClient
        ip_req = requests.get('http://ip-api.com/json/', timeout=5)
        ip_data = ip_req.json()
        lat = ip_data.get('lat', 30.0444)
        lon = ip_data.get('lon', 31.2357)
    except Exception:
        lat, lon = 30.0444, 31.2357
    try:
        EMAIL    = "mahmoud.elmohtady@gmail.com"
        PASSWORD = "Mahmoud=2020"
        async with AsyncMawaqitClient(username=EMAIL, password=PASSWORD,
                                       latitude=lat, longitude=lon) as client:
            await client.login()
            mosques = await client.all_mosques_neighborhood()
            return {"results": mosques}
    except Exception as e:
        print("Mawaqit scan error:", e)
        return {"results": []}

@app.get("/api/mawaqit/sync")
async def sync_mawaqit_mosque(slug: str):
    try:
        from mawaqit import AsyncMawaqitClient
        EMAIL    = "mahmoud.elmohtady@gmail.com"
        PASSWORD = "Mahmoud=2020"
        async with AsyncMawaqitClient(username=EMAIL, password=PASSWORD) as client:
            await client.login()
            mosques = await client.fetch_mosques_by_keyword(slug)
            if not mosques:
                return {"status": "error", "message": "Mosque not found"}
            mosque_data = mosques[0]
            times = mosque_data.get('times')
            if not times:
                client.mosque = mosque_data['uuid']
                times = await client.fetch_prayer_times()
            return {"status": "ok", "calendar": [], "times": times}
    except Exception as e:
        print("Sync error:", e)
        return {"status": "error", "message": str(e)}

# ── Alarm Scheduler ──────────────────────────────────────────────────────────
async def alarm_scheduler():
    """
    Background task: runs forever, wakes every minute, fires any active alarm
    whose time matches now AND whose repeat days include today.
    """
    print("Alarm scheduler started")
    while True:
        now = datetime.now()
        current_time = now.strftime("%H:%M")          # e.g. "07:30"
        current_day  = now.strftime("%a")              # e.g. "Mon"

        try:
            with get_db() as db:
                alarms = db.execute(
                    "SELECT * FROM alarms WHERE active = 1"
                ).fetchall()

            for alarm in alarms:
                alarm = dict(alarm)
                if alarm["time"] != current_time:
                    continue

                # Check weekday — if days is empty/None, fire every day
                days_str = alarm.get("days") or ""
                day_list = [d.strip() for d in days_str.split(",") if d.strip()]
                if day_list and current_day not in day_list:
                    continue

                print(f"Alarm firing: '{alarm['label']}' at {current_time}")

                sound = alarm.get("sound_file")
                path  = resolve_sound_path(sound) if sound else None

                if path:
                    threading.Thread(target=play_file_bg, args=(path,), daemon=True).start()
                else:
                    # Fallback: speak the label via espeak
                    label = alarm.get("label") or "Alarm"
                    def _speak(lbl=label):
                        subprocess.run(
                            ["espeak-ng", lbl],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                        )
                    threading.Thread(target=_speak, daemon=True).start()

        except Exception as e:
            print(f"Alarm scheduler error: {e}")

        # Sleep until the start of the next minute
        await asyncio.sleep(60 - datetime.now().second)

# ── Serve frontend ───────────────────────────────────────────────────────
STATIC_DIR = "/app/static"
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
