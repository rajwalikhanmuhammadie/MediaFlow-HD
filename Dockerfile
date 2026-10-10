FROM node:22-bookworm-slim

# Install Python 3, pip, FFmpeg (for 1080p/2K/4K stream muxing & MP3 extraction), curl, and CA certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests and install dependencies
COPY package.json ./
RUN npm install

# Download latest standalone yt-dlp binary and make it executable
RUN mkdir -p /app/bin && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /app/bin/yt-dlp && \
    chmod a+rx /app/bin/yt-dlp

# Copy application source, verify yt-dlp via Python startup script, and build frontend + server bundle
COPY . .
RUN chmod +x /app/scripts/check_update_ytdlp.py && python3 /app/scripts/check_update_ytdlp.py
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
