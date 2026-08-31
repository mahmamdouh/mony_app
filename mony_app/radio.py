import os
import time
import sys

# 1. VLC Path Configuration (Windows specific)
vlc_path = r'C:\Program Files\VideoLAN\VLC'
if os.name == 'nt':
    if os.path.exists(vlc_path):
        os.add_dll_directory(vlc_path)
    else:
        print("Error: VLC Media Player not found in C:\Program Files\VideoLAN\VLC")
        sys.exit(1)

import vlc

# 2. UPDATED 2026 Working Radio Stations
# "1": ("Quran Kareem Radio (Cairo)", "https://n03.radiojar.com/8s5u5tpdtwzuv"),
#     "2": ("Radio 9090 FM", "https://9090streaming.mobtada.com/9090FMEGYPT"),
stations = {
"1": ("Quran Kareem Radio (Cairo)", "http://n0a.radiojar.com/8s5u5tpdtwzuv"),
                                     
    "2": ("Radio 9090 FM", "https://9090streaming.mobtada.com/9090FMEGYPT"),
    "3": ("BBC Arabic","http://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio")
}

def start_radio():
    print("\n--- Egypt Radio 2026 (Live Stream) ---")
    for key, (name, _) in stations.items():
        print(f"[{key}] {name}")
    
    choice = input("\nSelect a station number (or 'q' to quit): ").strip()
    
    if choice in stations:
        name, url = stations[choice]
        print(f"\n>> Tuning into: {name}...")
        
        # '--aout=directsound' forces audio on Windows to avoid the silence issue
        instance = vlc.Instance('--no-video', '--quiet', '--aout=directsound')
        player = instance.media_player_new()
        media = instance.media_new(url)
        player.set_media(media)
        
        player.play()
        
        # Give it a moment to buffer
        print(">> Buffering... Sound should start in a few seconds.")
        time.sleep(2) 
        
        print(">> Playing! Press Ctrl+C to go back to Menu.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            player.stop()
            print(f"\n>> Stopped: {name}")
    elif choice.lower() == 'q':
        print("Goodbye!")
        sys.exit(0)
    else:
        print("Invalid selection!")

if __name__ == "__main__":
    while True:
        start_radio()