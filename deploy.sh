#!/bin/bash
set -e

echo "=========================================================="
echo "          Mony Kiosk: Deploying Application               "
echo "=========================================================="

# 1. Pre-create local directories
echo "Creating local data and sound directories..."
mkdir -p data sounds/songs sounds/intro sounds/Azan sounds/Adhkar sounds/Hadith
chmod -R 777 data sounds

# 2. Make scripts executable
echo "Configuring permissions for kiosk_start.sh..."
chmod +x kiosk_start.sh

# 3. Build the frontend (Vite) and copy into backend/static/
echo "[BUILD] Building frontend with npm..."
cd frontend

# Install npm dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "[BUILD] Installing npm dependencies..."
  npm install
fi

npm run build
echo "[BUILD] Frontend build complete."

cd ..

# Copy built frontend into backend/static/ (creates it if missing)
echo "[BUILD] Copying built frontend to backend/static/..."
rm -rf backend/static
mkdir -p backend/static
cp -r frontend/dist/. backend/static/
echo "[BUILD] backend/static/ updated with latest build."

# 4. Configure Labwc Autostart
echo "Configuring Labwc compositor autostart..."
mkdir -p "$HOME/.config/labwc"
AUTOSTART_FILE="$HOME/.config/labwc/autostart"

# Remove any existing references to kiosk_start.sh to avoid duplicates
if [ -f "$AUTOSTART_FILE" ]; then
  sed -i '/kiosk_start.sh/d' "$AUTOSTART_FILE"
fi

# Append kiosk script run command
echo "$HOME/mony_app/kiosk_start.sh &" >> "$AUTOSTART_FILE"
echo "Labwc autostart config updated successfully."

# 5. Configure custom boot splash image
echo "Configuring boot splash screen image..."
if [ -f "$HOME/mony_app/nemo_reef.png" ]; then
  echo "Converting and copying nemo_reef.png to boot splash..."
  sudo cp "$HOME/mony_app/nemo_reef.png" /usr/share/plymouth/themes/pix/splash.png || true
  sudo update-initramfs -u || true
  echo "Boot splash screen updated with Finding Nemo reef image!"
elif [ -f "$HOME/mony_app/Nabd.jpg" ]; then
  echo "Converting and copying Nabd.jpg to boot splash..."
  sudo convert "$HOME/mony_app/Nabd.jpg" /usr/share/plymouth/themes/pix/splash.png || true
  sudo update-initramfs -u || true
  echo "Boot splash screen updated."
else
  echo "Warning: splash image not found, skipping splash setup."
fi

# 6. Hot restart backend & kiosk immediately to apply changes without rebooting
echo "Restarting kiosk and backend services to apply changes..."
pkill -f kiosk_start.sh || true
pkill -f uvicorn || true
pkill -f chromium || true
pkill -f chromium-browser || true

# Auto-detect display session for SSH shells
if [ -z "$WAYLAND_DISPLAY" ] && [ -S "/run/user/1000/wayland-0" ]; then
  export WAYLAND_DISPLAY="wayland-0"
  export XDG_RUNTIME_DIR="/run/user/1000"
fi

# Relaunch kiosk_start.sh if active session is detected
if [ -n "$WAYLAND_DISPLAY" ] || [ -n "$DISPLAY" ]; then
  echo "Active graphical session detected. Relaunching Kiosk interface..."
  nohup "$HOME/mony_app/kiosk_start.sh" > /dev/null 2>&1 &
else
  echo "No active graphical session detected. Kiosk will start on next desktop login."
fi

echo "=========================================================="
echo " ✔ Deployment successful!"
echo " The application has been updated and restarted."
echo " If you do not see the updated kiosk on screen, run:"
echo "   pkill -HUP labwc"
echo " (or manually reboot the Pi: sudo reboot)"
echo "=========================================================="
