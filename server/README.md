# GE'EZ Music Backend Server

This is the backend server for GE'EZ music. It uses `yt-dlp` to fetch audio streams from YouTube.

## Local Development

```bash
npm install
node server.js
```

## Cloud Deployment (Railway)

1. Push the `server/` folder to a GitHub repository.
2. Connect to [Railway](https://railway.app).
3. Create a new project from the GitHub repo.
4. Railway will automatically detect the `Dockerfile` and deploy.

The server will be available at `https://your-project.railway.app`.

## Environment Variables

- `PORT`: Server port (default: 3001)
- `YT_DLP_PATH`: Path to yt-dlp binary (default: `./yt-dlp.exe` for local, `/usr/local/bin/yt-dlp` for Docker)

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/search?q=...` | Search for tracks |
| `GET /api/stream/:videoId` | Get stream URL |
| `GET /api/trending` | Get trending music |
| `GET /api/download/:videoId` | Download track as MP3 |
| `GET /api/health` | Health check |
