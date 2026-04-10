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
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
        
    return {"info": f"file '{file.filename}' saved at '{file_location}'"}

@router.get("/music")
def list_music():
    music_dir = "/data/music"
    if not os.path.exists(music_dir):
        return []
    return [f for f in os.listdir(music_dir) if f.endswith('.mp3') or f.endswith('.wav')]

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
    return {"results": [{"uuid": "dummy-uuid", "name": f"Mosque {query}"}]}
