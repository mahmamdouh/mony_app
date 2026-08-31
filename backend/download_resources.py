import os
import urllib.request
import threading
import ssl
import time

if os.path.exists("/sounds"):
    SOUNDS_BASE = "/sounds"
else:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    SOUNDS_BASE = os.path.join(PROJECT_ROOT, "sounds")

ADHIKR_DIR = os.path.join(SOUNDS_BASE, "Adhkar")
HADITH_DIR = os.path.join(SOUNDS_BASE, "Hadith")


# ── Reliable audio sources ──────────────────────────────────────────────────────
# Using Islamhouse CDN and GitHub-hosted audio files for reliability
RESOURCES = {
    "Adhkar": [
        (
            "Morning_Adhkar.mp3",
            # Islamhouse CDN — Morning Adhkar (Arabic narration, ~5MB)
            "https://islamhouse.com/files/audios/2839/ar/2839.mp3",
            # Fallback: Archive.org with browser UA
            "https://archive.org/download/Hisnul-Muslim-Fortress-Of-The-Muslim-Audio-MP3-CD/027_Morning_Supplications.mp3",
        ),
        (
            "Evening_Adhkar.mp3",
            "https://islamhouse.com/files/audios/2840/ar/2840.mp3",
            "https://archive.org/download/Hisnul-Muslim-Fortress-Of-The-Muslim-Audio-MP3-CD/028_Evening_Supplications.mp3",
        ),
        (
            "Before_Sleep.mp3",
            "https://islamhouse.com/files/audios/2841/ar/2841.mp3",
            "https://archive.org/download/Hisnul-Muslim-Fortress-Of-The-Muslim-Audio-MP3-CD/029_Supplications_Before_Sleeping.mp3",
        ),
    ],
    "Hadith": [
        (
            "Hadith_1.mp3",
            "https://archive.org/download/40HadithNawawiAudio/Hadith01.mp3",
            "https://ia801402.us.archive.org/18/items/40HadithNawawiAudio/Hadith01.mp3",
        ),
        (
            "Hadith_2.mp3",
            "https://archive.org/download/40HadithNawawiAudio/Hadith02.mp3",
            "https://ia801402.us.archive.org/18/items/40HadithNawawiAudio/Hadith02.mp3",
        ),
        (
            "Hadith_3.mp3",
            "https://archive.org/download/40HadithNawawiAudio/Hadith03.mp3",
            "https://ia801402.us.archive.org/18/items/40HadithNawawiAudio/Hadith03.mp3",
        ),
    ],
}

# ── Shared status dictionary ────────────────────────────────────────────────────
STATUS = {
    "status": "idle",
    "progress": 0,
    "current_file": None,
    "downloaded_files": [],
    "failed_files": [],
    "total_files": 6,
    "errors": [],
    "file_statuses": {},  # per-file: "pending" | "downloading" | "done" | "failed"
}

status_lock = threading.Lock()

CHROME_UA = (
    "Mozilla/5.0 (Linux; Android 10; Raspberry Pi) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _try_download(url, dest):
    """Attempt a single download. Returns True on success, raises on failure."""
    req = urllib.request.Request(url, headers={"User-Agent": CHROME_UA})
    context = ssl._create_unverified_context()
    with urllib.request.urlopen(req, context=context, timeout=60) as response:
        with open(dest, "wb") as out_file:
            while True:
                chunk = response.read(256 * 1024)  # 256 KB chunks
                if not chunk:
                    break
                out_file.write(chunk)
    return True


def download_file(urls, dest, filename, total_files):
    """
    Try each URL in `urls` up to 3 times before giving up.
    Updates STATUS in real time so the UI can show per-file progress.
    """
    global STATUS

    with status_lock:
        STATUS["current_file"] = filename
        STATUS["status"] = "downloading"
        STATUS["file_statuses"][filename] = "downloading"

    print(f"[DOWNLOAD] Starting: {filename}")
    last_error = None

    for url in urls:
        for attempt in range(1, 4):  # 3 retries per URL
            try:
                print(f"  → Trying ({attempt}/3): {url}")
                _try_download(url, dest)
                # Verify file is not tiny / corrupted
                if os.path.exists(dest) and os.path.getsize(dest) > 50_000:
                    print(f"  ✔ Done: {filename} ({os.path.getsize(dest)//1024} KB)")
                    with status_lock:
                        STATUS["downloaded_files"].append(filename)
                        STATUS["file_statuses"][filename] = "done"
                        STATUS["progress"] = int(
                            len(STATUS["downloaded_files"]) / total_files * 100
                        )
                    return  # success — exit function
                else:
                    # File too small — treat as failure
                    if os.path.exists(dest):
                        os.remove(dest)
                    raise ValueError(f"File too small after download: {os.path.getsize(dest) if os.path.exists(dest) else 0} bytes")
            except Exception as exc:
                last_error = str(exc)
                print(f"  ✗ Attempt {attempt} failed: {exc}")
                if os.path.exists(dest):
                    try:
                        os.remove(dest)
                    except Exception:
                        pass
                if attempt < 3:
                    time.sleep(2 ** attempt)  # 2s, 4s backoff

    # All attempts failed
    error_msg = f"❌ Failed to download {filename}: {last_error}"
    print(error_msg)
    with status_lock:
        STATUS["errors"].append(error_msg)
        STATUS["failed_files"].append(filename)
        STATUS["file_statuses"][filename] = "failed"


def run_download():
    global STATUS
    os.makedirs(ADHIKR_DIR, exist_ok=True)
    os.makedirs(HADITH_DIR, exist_ok=True)

    # Flatten the resource list
    all_items = []
    for category, items in RESOURCES.items():
        base_dir = ADHIKR_DIR if category == "Adhkar" else HADITH_DIR
        for entry in items:
            filename = entry[0]
            urls = list(entry[1:])  # primary + fallback URLs
            dest = os.path.join(base_dir, filename)
            all_items.append((filename, urls, dest))

    total_files = len(all_items)

    with status_lock:
        STATUS.update({
            "status": "downloading",
            "progress": 0,
            "current_file": None,
            "downloaded_files": [],
            "failed_files": [],
            "total_files": total_files,
            "errors": [],
            "file_statuses": {item[0]: "pending" for item in all_items},
        })

    # Check what is already downloaded
    already_done = []
    to_download = []
    for filename, urls, dest in all_items:
        if os.path.exists(dest) and os.path.getsize(dest) > 50_000:
            already_done.append(filename)
        else:
            to_download.append((filename, urls, dest))

    with status_lock:
        STATUS["downloaded_files"] = list(already_done)
        for fn in already_done:
            STATUS["file_statuses"][fn] = "done"
        STATUS["progress"] = int(len(already_done) / total_files * 100)

    print(f"[DOWNLOAD] {len(already_done)} already cached, {len(to_download)} to fetch")

    for filename, urls, dest in to_download:
        download_file(urls, dest, filename, total_files)

    with status_lock:
        n_done = len(STATUS["downloaded_files"])
        n_fail = len(STATUS["failed_files"])
        if n_fail == total_files:
            STATUS["status"] = "failed"
        elif n_fail > 0:
            STATUS["status"] = "partial"
        else:
            STATUS["status"] = "completed"
        STATUS["progress"] = 100
        STATUS["current_file"] = None

    print(f"[DOWNLOAD] Finished — {n_done} ok, {n_fail} failed. Status: {STATUS['status']}")


if __name__ == "__main__":
    run_download()
