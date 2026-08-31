import os
import urllib.request
import threading
import ssl

if os.path.exists("/sounds"):
    SOUNDS_BASE = "/sounds"
else:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    SOUNDS_BASE = os.path.join(PROJECT_ROOT, "sounds")

ADHIKR_DIR = os.path.join(SOUNDS_BASE, "Adhkar")
HADITH_DIR = os.path.join(SOUNDS_BASE, "Hadith")


RESOURCES = {
    "Adhkar": [
        ("Morning_Adhkar.mp3", "https://archive.org/download/Hisnul-Muslim-Fortress-Of-The-Muslim-Audio-MP3-CD/027_Morning_Supplications.mp3"),
        ("Evening_Adhkar.mp3", "https://archive.org/download/Hisnul-Muslim-Fortress-Of-The-Muslim-Audio-MP3-CD/028_Evening_Supplications.mp3"),
        ("Before_Sleep.mp3", "https://archive.org/download/Hisnul-Muslim-Fortress-Of-The-Muslim-Audio-MP3-CD/029_Supplications_Before_Sleeping.mp3")
    ],
    "Hadith": [
        ("Hadith_1.mp3", "https://archive.org/download/40HadithNawawiAudio/Hadith01.mp3"),
        ("Hadith_2.mp3", "https://archive.org/download/40HadithNawawiAudio/Hadith02.mp3"),
        ("Hadith_3.mp3", "https://archive.org/download/40HadithNawawiAudio/Hadith03.mp3")
    ]
}

# Shared status dictionary
STATUS = {
    "status": "idle",
    "progress": 0,
    "current_file": None,
    "downloaded_files": [],
    "total_files": 6,
    "errors": []
}

status_lock = threading.Lock()

def download_file(url, dest, filename, total_files):
    global STATUS
    try:
        with status_lock:
            STATUS["current_file"] = filename
            STATUS["status"] = "downloading"
            
        print(f"Downloading {url} to {dest}...")
        
        # Bypass SSL verification if needed, and set User-Agent
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        
        context = ssl._create_unverified_context()
        
        with urllib.request.urlopen(req, context=context) as response, open(dest, 'wb') as out_file:
            # Download in chunks of 1MB
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                out_file.write(chunk)
                
        print(f"Finished downloading {dest}")
        
        with status_lock:
            STATUS["downloaded_files"].append(filename)
            STATUS["progress"] = int((len(STATUS["downloaded_files"]) / total_files) * 100)
    except Exception as e:
        error_msg = f"Failed to download {filename}: {str(e)}"
        print(error_msg)
        with status_lock:
            STATUS["errors"].append(error_msg)
            # If the download failed, delete the partial/corrupted file to avoid false checkmarks
            if os.path.exists(dest):
                try:
                    os.remove(dest)
                except Exception as del_err:
                    print(f"Could not remove partial file {dest}: {del_err}")

def run_download():
    global STATUS
    os.makedirs(ADHIKR_DIR, exist_ok=True)
    os.makedirs(HADITH_DIR, exist_ok=True)
    
    # Flatten the resource list to know total files and download sequentially
    all_items = []
    for category, items in RESOURCES.items():
        base_dir = ADHIKR_DIR if category == "Adhkar" else HADITH_DIR
        for filename, url in items:
            all_items.append((category, filename, url, os.path.join(base_dir, filename)))
            
    total_files = len(all_items)
    
    with status_lock:
        STATUS["status"] = "downloading"
        STATUS["progress"] = 0
        STATUS["current_file"] = None
        STATUS["downloaded_files"] = []
        STATUS["total_files"] = total_files
        STATUS["errors"] = []
        
    # Check what is already downloaded first, or download missing
    download_needed = []
    for category, filename, url, dest in all_items:
        if os.path.exists(dest) and os.path.getsize(dest) > 100000: # Ensure not a tiny corrupted file
            with status_lock:
                if filename not in STATUS["downloaded_files"]:
                    STATUS["downloaded_files"].append(filename)
        else:
            download_needed.append((category, filename, url, dest))
            
    # Update progress with already existing files
    with status_lock:
        if total_files > 0:
            STATUS["progress"] = int((len(STATUS["downloaded_files"]) / total_files) * 100)
            
    for category, filename, url, dest in download_needed:
        download_file(url, dest, filename, total_files)
        
    with status_lock:
        if len(STATUS["errors"]) == total_files:
            STATUS["status"] = "failed"
        elif len(STATUS["downloaded_files"]) == total_files:
            STATUS["status"] = "completed"
            STATUS["progress"] = 100
            STATUS["current_file"] = None
        else:
            STATUS["status"] = "completed" # completed with partial errors
            STATUS["progress"] = 100
            STATUS["current_file"] = None
            
    print(f"Download thread finished! Status: {STATUS['status']}")

if __name__ == "__main__":
    run_download()
