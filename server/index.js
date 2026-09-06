import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import requestIp from 'request-ip';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { getPodcastBySlug, getEpisodeBySlug, getSettings } from './db.js';

import podcastsRouter from './routes/podcasts.js';
import episodesRouter from './routes/episodes.js';
import rssRouter from './routes/rss.js';
import jsonRouter from './routes/json.js';
import importRouter from './routes/import.js';
import authRouter from './routes/auth.js';
import statsRouter from './routes/stats.js';
import { uploadArtwork, uploadAudio } from './middleware/upload.js';
import { writePeaksFile } from './utils/peaks.js';
import { requireAuth } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

const mediaDir = process.env.MEDIA_DIR
  ? (process.env.MEDIA_DIR.startsWith('.') ? path.resolve(rootDir, process.env.MEDIA_DIR) : path.resolve(process.env.MEDIA_DIR))
  : path.join(rootDir, 'media');
const dataDir = process.env.DATA_DIR
  ? (process.env.DATA_DIR.startsWith('.') ? path.resolve(rootDir, process.env.DATA_DIR) : path.resolve(process.env.DATA_DIR))
  : path.join(rootDir, 'data');
if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true });
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(requestIp.mw());

// Static media files (audio, artwork, etc.)
app.use('/media', express.static(mediaDir));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/podcasts', podcastsRouter);
app.use('/api/episodes', episodesRouter);
app.use('/api/rss', rssRouter);
app.use('/api/json', jsonRouter);
app.use('/api/import', requireAuth, importRouter);
app.use('/api', statsRouter);

// Upload endpoints
app.post('/api/upload/artwork', requireAuth, uploadArtwork.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No artwork file' });
  const url = `/media/artwork/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size });
});

app.post('/api/upload/audio', requireAuth, uploadAudio.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file' });
  const url = `/media/audio/${req.file.filename}`;
  let peaksUrl = '';
  try {
    const peaks = await writePeaksFile(req.file.path, path.join(mediaDir, 'peaks'));
    peaksUrl = peaks.url;
  } catch (err) {
    console.warn('Could not generate peaks for upload', req.file.filename, err.message);
  }
  res.json({ url, peaksUrl, filename: req.file.filename, size: req.file.size, mimeType: req.file.mimetype });
});

const distPath = path.join(rootDir, 'ui', 'dist');

const baseUrl = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function absoluteMediaUrl(url) {
  if (!url) return `${baseUrl}/default-cover.svg`;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return baseUrl + url;
  return baseUrl + '/' + url;
}

function truncate(text, len = 160) {
  const t = String(text || '').trim();
  if (t.length <= len) return t;
  return t.slice(0, len).replace(/\s+\S*$/, '') + '…';
}

let indexHtml = '';
try {
  indexHtml = readFileSync(path.join(distPath, 'index.html'), 'utf8');
} catch {
  indexHtml = '';
}

function renderPage(res, { title, description, url, image }) {
  if (!indexHtml) return res.sendFile(path.join(distPath, 'index.html'));
  const desc160 = escapeHtml(truncate(description, 160));
  const ogMeta = [
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(truncate(description, 80))}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:type" content="website">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join('\n');
  const html = indexHtml
    .replace(/%PAGE_TITLE%/g, escapeHtml(title))
    .replace(/%PAGE_DESCRIPTION%/g, desc160)
    .replace(/<\/head>/i, `${ogMeta}\n</head>`);
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

app.get('/podcast/:slug', (req, res, next) => {
  const podcast = getPodcastBySlug(req.params.slug);
  if (!podcast) return next();
  renderPage(res, {
    title: podcast.title,
    description: podcast.description,
    url: `${baseUrl}/podcast/${req.params.slug}`,
    image: absoluteMediaUrl(podcast.artwork || '/default-cover.svg'),
  });
});

app.get('/podcast/:slug/episode/:episodeSlug', (req, res, next) => {
  const podcast = getPodcastBySlug(req.params.slug);
  const episode = getEpisodeBySlug(req.params.episodeSlug);
  if (!podcast || !episode) return next();
  renderPage(res, {
    title: episode.title,
    description: episode.description,
    url: `${baseUrl}/podcast/${req.params.slug}/episode/${req.params.episodeSlug}`,
    image: absoluteMediaUrl(episode.artwork || podcast.artwork || '/default-cover.svg'),
  });
});

if (existsSync(distPath)) {
  app.use(express.static(distPath, { index: false }));
  app.get('*', (_req, res) => {
    if (!indexHtml) return res.sendFile(path.join(distPath, 'index.html'));
    const settings = getSettings();
    const title = settings.siteTitle && settings.siteTitle !== 'Casterr' ? settings.siteTitle : 'Discover podcasts';
    const description = settings.siteDescription && settings.siteDescription !== 'Self-hosted podcast platform' ? settings.siteDescription : 'Listen to podcasts';
    const html = indexHtml
      .replace(/%PAGE_TITLE%/g, escapeHtml(title))
      .replace(/%PAGE_DESCRIPTION%/g, escapeHtml(description));
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });
}

app.listen(PORT, () => {
  console.log(`Casterr server running on http://localhost:${PORT}`);
});
