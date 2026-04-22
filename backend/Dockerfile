FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    vlc \
    espeak-ng \
    alsa-utils \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (VLC refuses to run as root)
RUN useradd -m -u 1000 mony && \
    usermod -aG audio mony

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Copy pre-built frontend static files
COPY static/ /app/static/

# Copy entrypoint script (runs as root, fixes /data perms, then drops to mony)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Do NOT set USER here — entrypoint handles the switch via gosu
EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
