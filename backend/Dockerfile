FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    vlc \
    espeak-ng \
    alsa-utils \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (VLC refuses to run as root)
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
