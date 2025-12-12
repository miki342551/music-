# Use Node.js LTS
FROM node:20-slim

# Install yt-dlp and ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY . .

# Expose port
EXPOSE 3001

# Set environment variable for yt-dlp path
ENV YT_DLP_PATH=/usr/local/bin/yt-dlp
ENV NODE_ENV=production

# Start server
CMD ["node", "server.js"]
