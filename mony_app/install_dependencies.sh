#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "=========================================================="
echo "          Mony Kiosk: Install System Dependencies         "
echo "=========================================================="

# 1. Update APT lists
echo "[1/5] Updating APT package repositories..."
sudo apt-get update

# 2. Install Chromium, ALSA utils, unclutter, git, and other kiosk tools
echo "[2/5] Installing Kiosk dependencies (Chromium, unclutter, alsa-utils)..."
sudo apt-get install -y \
  chromium-browser \
  unclutter \
  x11-xserver-utils \
  alsa-utils \
  git \
  curl

# 3. Install Docker if missing
if ! command -v docker >/dev/null 2>&1; then
  echo "[3/5] Docker not found. Installing Docker using official script..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  rm -f get-docker.sh
else
  echo "[3/5] Docker is already installed."
fi

# 4. Add the current user to the docker group
echo "[4/5] Adding user '$USER' to the docker group..."
sudo usermod -aG docker $USER

# 5. Disable screen blanking/screensavers in Raspberry Pi OS
echo "[5/5] Disabling Raspberry Pi screen blanking..."
sudo raspi-config nonint do_blanking 0

echo "=========================================================="
echo " ✔ Installation complete!"
echo " IMPORTANT: Please log out and back in, or run:"
echo "   newgrp docker"
echo " before running deploy.sh so the Docker group is loaded."
echo "=========================================================="
