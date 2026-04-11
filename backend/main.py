import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import docker

try:
    from routes import router
except ImportError:
    pass

# Initialize Docker client
try:
    docker_client = docker.from_env()
except Exception as e:
    print(f"Warning: Could not connect to Docker socket. {e}")
    docker_client = None

# Audio Priority Logic
def pause_audio_engine():
    if not docker_client: return
    try:
        container = docker_client.containers.get('mony_audio_engine')
        container.kill(signal='SIGSTOP')
        print("Paused Audio Engine (SIGSTOP)")
    except docker.errors.NotFound:
        print("mony_audio_engine container not found")
    except Exception as e:
        print(f"Error pausing audio engine: {e}")

def resume_audio_engine():
    if not docker_client: return
    try:
        container = docker_client.containers.get('mony_audio_engine')
        container.kill(signal='SIGCONT')
        print("Resumed Audio Engine (SIGCONT)")
    except docker.errors.NotFound:
        pass
    except Exception as e:
        print(f"Error resuming audio engine: {e}")

# TTS Helper
async def play_tts(text: str, cache_name: str = None):
    # Pause other audio first
    pause_audio_engine()
    
    cache_dir = "/data/cache"
    os.makedirs(cache_dir, exist_ok=True)
    
    file_path = f"{cache_dir}/{cache_name}.mp3" if cache_name else f"{cache_dir}/temp_tts.mp3"
    
    # If not cached or no cache name, generate it
    if not cache_name or not os.path.exists(file_path):
        print(f"Generating TTS for: {text}")
        process = await asyncio.create_subprocess_exec(
            "edge-tts", "--text", text, "--write-media", file_path,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        await process.communicate()
        
        # Fallback to espeak if edge-tts fails (e.g. no internet)
        if process.returncode != 0:
            print("edge-tts failed, falling back to espeak-ng")
            file_path = f"{cache_dir}/temp_tts.wav"
            proc = await asyncio.create_subprocess_exec(
                "espeak-ng", "-w", file_path, text
            )
            await proc.communicate()
            
    # Play the file
    print(f"Playing TTS: {file_path}")
    if file_path.endswith('.mp3'):
        play_proc = await asyncio.create_subprocess_exec("mpg123", "-q", file_path)
    else:
        play_proc = await asyncio.create_subprocess_exec("aplay", "-q", file_path)
        
    await play_proc.communicate()
    
    # Resume audio
    resume_audio_engine()

# Play a chime
async def play_chime():
    # In a real app we'd have a chime.mp3. For now, beep using espeak or just skip.
    pass

async def play_intro_sound():
    pause_audio_engine()
    intro_dir = "/sounds/intro"
    played = False
    if os.path.exists(intro_dir):
        files = [f for f in os.listdir(intro_dir) if f.endswith('.mp3') or f.endswith('.wav')]
        if files:
            file_path = os.path.join(intro_dir, files[0])
            print(f"Playing intro sound: {file_path}")
            if file_path.endswith('.mp3'):
                play_proc = await asyncio.create_subprocess_exec("mpg123", "-q", file_path)
            else:
                play_proc = await asyncio.create_subprocess_exec("aplay", "-q", file_path)
            await play_proc.communicate()
            played = True
    
    if not played:
        # Fallback to TTS if no sounds in intro folder
        await play_tts("Test successful! Mony systems are online.", "test_speaker")
    else:
        resume_audio_engine()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Boot Sequence
    print("Mony Backend Starting up...")
    
    # Just a small delay to ensure ALSA is ready and docker containers are up
    await asyncio.sleep(2) 
    
    # Run in background task to not block startup
    asyncio.create_task(play_tts("Hello Mony", "hello_mony"))
    
    yield
    
    # Shutdown
    print("Mony Backend Shutting Down...")

app = FastAPI(lifespan=lifespan, title="Mony Smart Assistant API")

try:
    app.include_router(router, prefix="/api")
except NameError:
    pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://192.168.2.28"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "Mony"}

@app.get("/api/test_speaker")
async def test_speaker():
    import asyncio
    # Background task so it doesn't block request
    asyncio.create_task(play_intro_sound())
    return {"status": "ok"}

