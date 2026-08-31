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
  echo "Warning: Nabd.jpg not found, skipping splash setup."
fi

echo "=========================================================="
echo " ✔ Deployment successful!"
echo " The application is configured to run natively."
echo " To start the touch-screen kiosk visual interface,"
echo " restart your desktop environment or reboot the Pi:"
echo "   sudo reboot"
echo "=========================================================="
