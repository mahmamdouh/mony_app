import os
import subprocess
from typing import Optional
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from database import get_db

router = APIRouter()

class Alarm(BaseModel):
    time: str
    label: str
    days: str
    sound_file: Optional[str] = None
    active: bool = True

class RadioRequest(BaseModel):
    url: str
    action: str # play, pause

class MawaqitSettings(BaseModel):
    mosque_uuid: Optional[str] = None
    mosque_name: Optional[str] = None
    fajr_adhan: Optional[str] = None
    dhuhr_adhan: Optional[str] = None
    asr_adhan: Optional[str] = None
    maghrib_adhan: Optional[str] = None
    isha_adhan: Optional[str] = None

# Global process handles for radio and songs
current_radio_process = None
current_song_process = None

@router.get("/alarms")
def get_alarms():
    with get_db() as db:
        return [dict(r) for r in db.execute("SELECT * FROM alarms").fetchall()]

@router.post("/alarms")
def add_alarm(alarm: Alarm):
    with get_db() as db:
        db.execute("INSERT INTO alarms (time, label, days, sound_file, active) VALUES (?, ?, ?, ?, ?)", 
                   (alarm.time, alarm.label, alarm.days, alarm.sound_file, alarm.active))
        db.commit()
    return {"status": "ok"}

@router.delete("/alarms/{alarm_id}")
def delete_alarm(alarm_id: int):
    with get_db() as db:
        db.execute("DELETE FROM alarms WHERE id = ?", (alarm_id,))
        db.commit()
    return {"status": "ok"}

@router.patch("/alarms/{alarm_id}/toggle")
def toggle_alarm(alarm_id: int):
    with get_db() as db:
        # Flip the active flag
        db.execute("UPDATE alarms SET active = NOT active WHERE id = ?", (alarm_id,))
        db.commit()
    return {"status": "ok"}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    music_dir = "/data/music"
    os.makedirs(music_dir, exist_ok=True)
    
    file_location = f"{music_dir}/{file.filename}"
    content = await file.read()
    with open(file_location, "wb+") as file_object:
        file_object.write(content)
        
    return {"info": f"file '{file.filename}' saved at '{file_location}'"}

@router.get("/music")
def list_music():
    music_dirs = ["/data/music", "/sounds/Azan", "/sounds/intro", "/sounds/songs"]
    files = []
    for d in music_dirs:
        if os.path.exists(d):
            # prepend directory name for UI clarity or just return filename
            for f in os.listdir(d):
                if f.endswith('.mp3') or f.endswith('.wav'):
                    files.append(f"{os.path.basename(d)}/{f}" if d != "/data/music" else f)
    return files

class VolumeRequest(BaseModel):
    level: int

@router.post("/radio")
def radio_control(req: RadioRequest):
    global current_radio_process

    # Stop previous stream
    if current_radio_process is not None:
        try:
            current_radio_process.terminate()
            current_radio_process.wait(timeout=2)
        except Exception:
            pass
        current_radio_process = None

    if req.action == 'play' and req.url:
        print(f"Starting radio stream via ffmpeg: {req.url}")
        # ffmpeg handles HTTP/HTTPS streams and works as root, mpg123 does not
        current_radio_process = subprocess.Popen(
            ["ffmpeg", "-re", "-loglevel", "quiet",
             "-i", req.url,
             "-vn", "-f", "alsa", "hw:1,0", "-y"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

    return {"status": "ok"}

@router.get("/mawaqit/scan")
async def scan_nearest_mosques():
    import requests
    from mawaqit import AsyncMawaqitClient
    try:
        ip_req = requests.get('http://ip-api.com/json/', timeout=5)
        ip_data = ip_req.json()
        lat = ip_data.get('lat', 30.0444)
        lon = ip_data.get('lon', 31.2357)
    except:
        lat = 30.0444
        lon = 31.2357
        
    try:
        EMAIL = "mahmoud.elmohtady@gmail.com"
        PASSWORD = "Mahmoud=2020"
        async with AsyncMawaqitClient(username=EMAIL, password=PASSWORD, latitude=lat, longitude=lon) as client:
            await client.login()
            mosques = await client.all_mosques_neighborhood()
            return {"results": mosques}
    except Exception as e:
        print("Mawaqit scan error:", e)
        return {"results": []}

@router.get("/mawaqit/sync")
async def sync_mawaqit_mosque(slug: str):
    from mawaqit import AsyncMawaqitClient
    try:
        EMAIL = "mahmoud.elmohtady@gmail.com"
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

@router.get("/mawaqit/settings")
def get_mawaqit_settings():
    with get_db() as db:
        res = db.execute("SELECT * FROM mawaqit_settings ORDER BY id DESC LIMIT 1").fetchone()
        if res:
            return dict(res)
        return {}

@router.post("/mawaqit/settings")
def save_mawaqit_settings(settings: MawaqitSettings):
    with get_db() as db:
        res = db.execute("SELECT id FROM mawaqit_settings ORDER BY id DESC LIMIT 1").fetchone()
        if res:
            db.execute('''
                UPDATE mawaqit_settings 
                SET mosque_uuid=?, mosque_name=?, fajr_adhan=?, dhuhr_adhan=?, asr_adhan=?, maghrib_adhan=?, isha_adhan=?
                WHERE id=?
            ''', (settings.mosque_uuid, settings.mosque_name, settings.fajr_adhan, settings.dhuhr_adhan, settings.asr_adhan, settings.maghrib_adhan, settings.isha_adhan, res['id']))
        else:
            db.execute('''
                INSERT INTO mawaqit_settings 
                (mosque_uuid, mosque_name, fajr_adhan, dhuhr_adhan, asr_adhan, maghrib_adhan, isha_adhan)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (settings.mosque_uuid, settings.mosque_name, settings.fajr_adhan, settings.dhuhr_adhan, settings.asr_adhan, settings.maghrib_adhan, settings.isha_adhan))
        db.commit()
    return {"status": "ok"}

@router.get("/songs")
def list_songs():
    songs_dir = "/sounds/songs"
    if not os.path.exists(songs_dir):
        return []
    return [f for f in os.listdir(songs_dir) if f.endswith('.mp3') or f.endswith('.wav')]

class SongPlayRequest(BaseModel):
    filename: str
    action: str

current_song_process = None

@router.post("/songs/play")
def play_song(req: SongPlayRequest):
    global current_song_process

    if current_song_process is not None:
        try:
            current_song_process.terminate()
            current_song_process.wait(timeout=2)
        except Exception:
            pass
        current_song_process = None

    if req.action == 'play' and req.filename:
        dir_map = {
            "Azan": "/sounds/Azan",
            "intro": "/sounds/intro",
            "songs": "/sounds/songs"
        }

        file_path = None
        if "/" in req.filename:
            folder, fname = req.filename.split("/", 1)
            if folder in dir_map:
                file_path = os.path.join(dir_map[folder], fname)
        else:
            file_path = os.path.join("/data/music", req.filename)

        if not file_path or not os.path.exists(file_path):
            file_path = os.path.join("/sounds/songs", req.filename)

        if file_path and os.path.exists(file_path):
            print(f"Playing track: {file_path}")
            if file_path.endswith('.mp3'):
                current_song_process = subprocess.Popen(
                    ["mpg123", "-o", "alsa", "-a", "hw:1,0", "-q", file_path],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
            else:
                current_song_process = subprocess.Popen(
                    ["aplay", "-D", "default", "-q", file_path],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
        else:
            print(f"File not found: {req.filename}")

    return {"status": "ok"}
                
    return {"status": "ok"}

@router.get("/volume")
def get_system_volume():
    try:
        res = subprocess.run(["amixer", "sget", "PCM"], capture_output=True, text=True)
        import re
        match = re.search(r'\[(\d+)%\]', res.stdout)
        if match:
            return {"level": int(match.group(1))}
    except:
        pass
    return {"level": 50}

@router.post("/volume")
def set_system_volume(req: VolumeRequest):
    level = max(0, min(100, req.level))
    cmd = ["amixer", "sset", "PCM", f"{level}%"]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return {"status": "ok", "level": level}
    except Exception as e:
        return {"status": "error", "message": str(e)}
