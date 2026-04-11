FROM python:3.11-slim

# Only what we need - no ffmpeg, no VLC apt package (use system VLC on the host)
RUN apt-get update && apt-get install -y \
    vlc \
    espeak-ng \
    alsa-utils \
    && rm -rf /var/lib/apt/lists/*

# ─── Create a non-root user so VLC will run ──────────────────────────────────
# VLC refuses to start as root. Running as 'mony' mirrors the Pi host user.
RUN useradd -m -u 1000 mony && \
    usermod -aG audio mony

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Copy pre-built frontend static files (build locally, don't build in Docker)
COPY static/ /app/static/

USER mony

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
