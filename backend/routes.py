import os
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from database import get_db

router = APIRouter()

class Alarm(BaseModel):
    time: str
    label: str
    days: str
    active: bool = True

@router.get("/alarms")
def get_alarms():
    with get_db() as db:
        return [dict(r) for r in db.execute("SELECT * FROM alarms").fetchall()]

@router.post("/alarms")
def add_alarm(alarm: Alarm):
    with get_db() as db:
        db.execute("INSERT INTO alarms (time, label, days, active) VALUES (?, ?, ?, ?)", 
                   (alarm.time, alarm.label, alarm.days, alarm.active))
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

@router.get("/mawaqit/search")
def search_mosque(query: str):
    import requests
    # Dummy integration since actual Mawaqit API token would be needed
    # A real integration would query https://mawaqit.net/api/2.0/mosque/search
    return {"results": [{"uuid": "dummy-uuid", "name": f"Mosque {query}"}]}
