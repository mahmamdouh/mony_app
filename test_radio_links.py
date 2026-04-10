import requests
import sys

# Replace with real streaming URLs you want to verify
RADIO_STATIONS = [
    {"name": "Quran Kareem", "url": "http://n0a.radiojar.com/8s5u5tpdtwzuv"},
    {"name": "Mega FM 92.7", "url": "https://ice31.securenetsystems.net/NOGOUM"}, # Placeholder nogoum config
    {"name": "Nogoum FM 100.6", "url": "https://ice31.securenetsystems.net/NOGOUM"},
    {"name": "BBC Arabic", "url": "http://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio"},
    {"name": "Radio Misr", "url": "https://ice31.securenetsystems.net/NOGOUM"} # Placeholder for misr
]

def check_stream(station):
    name = station["name"]
    url = station["url"]
    print(f"Testing stream: {name} ({url})")
    
    try:
        # Stream=True so we don't download the whole stream, just get the headers
        response = requests.get(url, stream=True, timeout=5)
        
        status = response.status_code
        content_type = response.headers.get("Content-Type", "")
        
        if status == 200 and ("audio" in content_type or "mpeg" in content_type.lower() or "aac" in content_type.lower()):
            print(f"  [SUCCESS] Valid stream! Status: {status}, Type: {content_type}\n")
        else:
            print(f"  [WARNING] Stream might be invalid. Status: {status}, Type: {content_type}\n")
    except Exception as e:
        print(f"  [ERROR] Could not connect to stream: {e}\n")

if __name__ == "__main__":
    print("--- Mony Radio Stream Tester ---")
    for st in RADIO_STATIONS:
        check_stream(st)
    print("Done!")
