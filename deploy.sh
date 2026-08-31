#!/bin/bash
set -e

echo "=========================================================="
echo "          Mony Kiosk: Deploying Application               "
echo "=========================================================="

# 1. Pre-create local data directory to avoid root ownership issues on mount
echo "Creating local data directory for sqlite database..."
mkdir -p data
# Ensure correct ownership
chmod 777 data

# 2. Make kiosk startup script executable
echo "Configuring permissions for kiosk_start.sh..."
chmod +x kiosk_start.sh

# 3. Configure Labwc Autostart
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

# 4. Configure custom boot splash image
echo "Configuring boot splash screen image..."
if [ -f "$HOME/mony_app/Nabd.jpg" ]; then
  echo "Converting and copying Nabd.jpg to boot splash..."
  sudo convert "$HOME/mony_app/Nabd.jpg" /usr/share/plymouth/themes/pix/splash.png
  sudo update-initramfs -u || true
  echo "Boot splash screen updated."
else
  echo "Warning: Nabd.jpg not found, skipping splash setup."
fi

# 5. Build and start containers
echo "Starting Docker build & container composition..."
# Using 'sg docker' allows this script to be run immediately after install_dependencies.sh
# without requiring a full user logout/re-login.
sg docker -c "docker compose down && docker compose build && docker compose up -d"

echo "=========================================================="
echo " ✔ Deployment successful!"
echo " The application containers are now running."
echo " To start the touch-screen kiosk visual interface,"
echo " restart your desktop environment or reboot the Pi:"
echo "   sudo reboot"
echo "=========================================================="
