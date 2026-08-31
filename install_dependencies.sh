#!/bin/bash
set -e

echo "=========================================================="
echo "          Mony Kiosk: Install System Dependencies"
echo "=========================================================="

# 1. Update package list
echo "[1/4] Updating APT package repositories..."
sudo apt-get update

# 2. Install Chromium, ALSA utils, unclutter, git, gcompris-qt, imagemagick, and python tools
echo "[2/4] Installing Kiosk dependencies, GCompris, and Python tools..."
sudo apt-get install -y \
  chromium-browser \
  unclutter \
  x11-xserver-utils \
  alsa-utils \
  git \
  curl \
  gcompris-qt \
  imagemagick \
  python3-pip \
  python3-venv \
  fonts-noto-color-emoji \
  plymouth


# 3. Create host python virtual environment for backend and install requirements natively
echo "[3/4] Creating host python virtual environment for backend..."
cd "$(dirname "$0")/backend"
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
cd ..

# 4. Disable screen blanking/screensavers in Raspberry Pi OS
echo "[4/4] Disabling Raspberry Pi screen blanking..."
sudo raspi-config nonint do_blanking 0 || true

echo "=========================================================="
echo " ✔ Installation complete!"
echo " Native host environment is configured."
echo " Now run './deploy.sh' to configure the boot splash and compile assets."
echo "=========================================================="
