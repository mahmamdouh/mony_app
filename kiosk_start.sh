#!/bin/bash

# Disable screen blanking, screensaver, and display power management
xset s off
xset -dpms
xset s noblank

# Hide the mouse cursor when inactive (if unclutter is installed)
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.5 -root &
fi

# Infinite loop to keep Chromium running if it crashes
while true; do
  # Clean up Chromium crash state flags so it doesn't show "Chromium didn't shut down correctly" restore banners
  PREFS_FILE="$HOME/.config/chromium/Default/Preferences"
  if [ -f "$PREFS_FILE" ]; then
    sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$PREFS_FILE"
    sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "$PREFS_FILE"
  fi

  # Find the Chromium binary on the system
  if command -v chromium-browser >/dev/null 2>&1; then
    CHROME_BIN="chromium-browser"
  elif command -v chromium >/dev/null 2>&1; then
    CHROME_BIN="chromium"
  else
    echo "Error: Chromium not found!"
    exit 1
  fi

  # Launch Chromium in Kiosk mode pointing to the local dashboard
  # Also set autoplay policy so alarms/Adhan sound triggers work without requiring a user tap first.
  # Use password-store=basic to disable system keyring unlock prompts.
  $CHROME_BIN --noerrdialogs --disable-infobars --kiosk http://localhost --autoplay-policy=no-user-gesture-required --no-sandbox --password-store=basic

  sleep 5
done
