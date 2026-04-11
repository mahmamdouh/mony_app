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

# Global variable to hold running radio process
current_radio_process = None

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

@router.post("/radio")
def radio_control(req: RadioRequest):
    global current_radio_process
    
    # Always kill previous process if running
    if current_radio_process is not None:
        current_radio_process.terminate()
        current_radio_process = None
        
    if req.action == 'play' and req.url:
        print(f"Starting radio stream: {req.url}")
        # Use mpg123 to stream web radio
        current_radio_process = subprocess.Popen(["mpg123", "-q", req.url])
        
    return {"status": "ok"}

@router.get("/mawaqit/search")
def search_mosque(query: str):
    import requests
    try:
        geo_req = requests.get(f'https://nominatim.openstreetmap.org/search?q={query}&format=json', headers={'User-Agent': 'Mony/1.0'}, timeout=10)
        geo_data = geo_req.json()
        if not geo_data:
            return {"results": []}
        lat = geo_data[0]['lat']
        lon = geo_data[0]['lon']
        # Hit Mawaqit
        mq_req = requests.get(f'https://mawaqit.net/api/2.0/mosque/search?lat={lat}&lon={lon}', timeout=10)
        return {"results": mq_req.json()}
    except Exception as e:
        print("Geocoding/Mawaqit search error:", e)
        return {"results": []}

@router.get("/mawaqit/sync")
def sync_mawaqit_mosque(slug: str):
    import requests
    import re
    import json
    try:
        r = requests.get(f'https://mawaqit.net/en/{slug}', headers={'User-Agent': 'Mozilla/5.0 Mony/1.0'}, timeout=10)
        times = re.search(r'let confData = (\{.*?\});', r.text)
        if times:
            data = json.loads(times.group(1))
            return {"status": "ok", "calendar": data.get("calendar", []), "times": data.get("times", [])}
        else:
            return {"status": "error", "message": "Could not parse times from mosque page."}
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
        current_song_process.terminate()
        current_song_process = None
        
    if req.action == 'play' and req.filename:
        file_path = os.path.join("/sounds/songs", req.filename)
        if os.path.exists(file_path):
            if file_path.endswith('.mp3'):
                current_song_process = subprocess.Popen(["mpg123", "-q", file_path])
            else:
                current_song_process = subprocess.Popen(["aplay", "-q", file_path])
                
    return {"status": "ok"}
