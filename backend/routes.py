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
    # External API requires a key. For now, returning mock data that helps UI visualization.
    # Replace this with the actual Mawaqit search HTTP call or library method when token is available.
    return {"results": [{"uuid": f"uuid-{query}", "name": f"Mosque {query}"}, {"uuid": "uuid-002", "name": "Al-Azhar Mosque (Mock)"}]}

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
