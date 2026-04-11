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

# Global VLC
try:
    import vlc
    vlc_instance = vlc.Instance('--no-video', '--quiet')
except Exception as e:
    print(f"Warning: Could not initialize VLC in routes. {e}")
    vlc_instance = None

current_radio_player = None

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
    global current_radio_player
    
    if current_radio_player is not None:
        if hasattr(current_radio_player, 'stop'):
            current_radio_player.stop()
        else:
            current_radio_player.terminate()
        current_radio_player = None
        
    if req.action == 'play' and req.url:
        print(f"Starting radio stream: {req.url}")
        if vlc_instance:
            current_radio_player = vlc_instance.media_player_new()
            media = vlc_instance.media_new(req.url)
            current_radio_player.set_media(media)
            current_radio_player.play()
        else:
            current_radio_player = subprocess.Popen(["mpg123", "-q", req.url])
        
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

current_song_player = None

@router.post("/songs/play")
def play_song(req: SongPlayRequest):
    global current_song_player
    
    if current_song_player is not None:
        if hasattr(current_song_player, 'stop'):
            current_song_player.stop()
        else:
            current_song_player.terminate()
        current_song_player = None
        
    if req.action == 'play' and req.filename:
        file_path = os.path.join("/sounds/songs", req.filename)
        if os.path.exists(file_path):
            if vlc_instance:
                current_song_player = vlc_instance.media_player_new()
                media = vlc_instance.media_new(file_path)
                current_song_player.set_media(media)
                current_song_player.play()
            else:
                if file_path.endswith('.mp3'):
                    current_song_player = subprocess.Popen(["mpg123", "-q", file_path])
                else:
                    current_song_player = subprocess.Popen(["aplay", "-q", file_path])
                
    return {"status": "ok"}
