# Casterr

Self-hosted podcast platform with RSS feeds and an embeddable, waveform audio player.

## Stack

- Backend: Node.js + Express, JSON file store, Multer file uploads, get-audio-duration (ffprobe)
- Frontend: Vite + React + Tailwind CSS + DaisyUI
- Audio waveforms: wavesurfer.js

## Setup

Local install:

```
npm install
cd ui && npm install
```

Create `.env` in the project root (see `.env.example`):

```
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
MEDIA_DIR=./media
DATA_DIR=./data
ADMIN_PASSWORD=...
JWT_SECRET=...
```

## Run

Development (backend + Vite HMR exposed on a single external port):

```
npm run dev
```

This starts the API server on port `3001` and the Vite dev server on port `3000`. The Vite dev server proxies `/api` and `/media` to the API, so the public UI and backend are both available at `http://localhost:3000`.

Production build & start (serves everything from one port):

```
npm run build
npm start
```

In production, the Express server serves the built `ui/dist/` files and the API from the same port.

## Usage

- Public site: `http://localhost:3000/`
- Admin: `http://localhost:3000/admin`
- RSS feed: `http://localhost:3000/api/rss` (or `/api/rss/<podcast-slug>`)
- Sub RSS feeds for seasons/shows: `/api/rss/<podcast-slug>/<group-slug>`
- Embed player: `http://localhost:3000/embed/<podcast-slug>?episode=<episode-slug>`
- Batch import: Admin dashboard → "Batch import" (reads files from `media/import/`)

## Notes

- Podcasts and episodes are stored in `data/db.json`.
- Uploaded artwork and audio files are stored in `media/artwork/` and `media/audio/`.
- RSS feeds include standard `<enclosure>`, iTunes, and Podcast Index namespace tags.
- Each podcast can have groups (seasons or shows) with their own sub-feeds.
- Drop audio files in `media/import/` and use the batch importer to create many episodes at once.

## Docker

Build the image:

```bash
docker build -t yourdockerhub/casterr:latest .
```

Run locally:

```bash
docker run -d -p 3000:3000 \
  -v ./data:/app/data \
  -v ./media:/app/media \
  -e ADMIN_PASSWORD=change-me \
  -e JWT_SECRET=change-me-to-a-long-random-string \
  yourdockerhub/casterr:latest
```

Or use `docker-compose.yml`:

```bash
cp .env.example .env
# edit .env, then:
docker compose up -d
```

Push to Docker Hub:

```bash
docker login
docker tag yourdockerhub/casterr:latest yourdockerhub/casterr:latest
docker push yourdockerhub/casterr:latest
```

The image includes `ffmpeg` for audio duration/waveform processing and persists `data/` and `media/` in volumes.
