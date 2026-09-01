# Casterr

![Casterr app icon](app-icon.png)

Self-hosted podcast platform with RSS feeds, batch imports, waveform audio player, and embeddable players.

- **GitHub:** https://github.com/MediaNerdStudio/castrr
- **Docker Hub:** https://hub.docker.com/r/jordifloor/casterr

## Run with Docker

```bash
docker run -d -p 3000:3000 \
  -v ./data:/app/data \
  -v ./media:/app/media \
  -e ADMIN_PASSWORD=your-admin-password \
  -e JWT_SECRET=your-long-random-secret \
  -e BASE_URL=https://your-domain.example \
  jordifloor/casterr:latest
```

## Development

```bash
npm install
cd ui && npm install
cd ..
npm run dev
```

The Vite dev UI runs on `http://localhost:3000` and the API on `http://localhost:3001`.

## Production build

```bash
npm run build
npm start
```

The built app is served from a single Express server on `http://localhost:3000`.
