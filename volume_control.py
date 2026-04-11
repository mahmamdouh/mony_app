import subprocess
import sys

def set_volume(percentage):
    """Sets the volume to a specific percentage (0-100)"""
    # Ensure percentage is within bounds
    percentage = max(0, min(100, percentage))
    
    # Command for ALSA mixer
    cmd = ["amixer", "sset", "PCM", f"{percentage}%"]
    
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"🔊 Volume adjusted to: {percentage}%")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # sys.argv[0] is the script name (volume_control.py)
    # sys.argv[1] is the first argument (the number)
    
    if len(sys.argv) > 1:
        try:
            input_value = int(sys.argv[1])
            set_volume(input_value)
        except ValueError:
            print("❌ Error: Please provide a number between 0 and 100.")
            print("Usage: python volume_control.py 50")
    else:
        print("⚠️ No volume level provided.")
        print("Usage: python volume_control.py [0-100]")