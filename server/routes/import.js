import express from 'express';
import { readdirSync, statSync, renameSync, existsSync, mkdirSync } from 'fs';
import { join, extname, basename, resolve } from 'path';
import { fileURLToPath } from 'url';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import slugify from '../utils/slugify.js';
import { writePeaksFile } from '../utils/peaks.js';
import { getPodcasts, createEpisode, getEpisodes } from '../db.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..', '..');
const mediaDir = process.env.MEDIA_DIR
  ? (process.env.MEDIA_DIR.startsWith('.') ? resolve(rootDir, process.env.MEDIA_DIR) : resolve(process.env.MEDIA_DIR))
  : join(rootDir, 'media');
const importDir = process.env.IMPORT_DIR
  ? (process.env.IMPORT_DIR.startsWith('.') ? resolve(rootDir, process.env.IMPORT_DIR) : resolve(process.env.IMPORT_DIR))
  : join(mediaDir, 'import');

const router = express.Router();

const allowedAudio = ['.mp3', '.m4a', '.wav', '.aac', '.ogg'];

function listImportFiles() {
  if (!existsSync(importDir)) mkdirSync(importDir, { recursive: true });
  return readdirSync(importDir)
    .filter(f => {
      const ext = extname(f).toLowerCase();
      return allowedAudio.includes(ext);
    })
    .map(f => {
      const stat = statSync(join(importDir, f));
      return { name: f, size: stat.size, mtime: stat.mtime.toISOString() };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

router.get('/', (_req, res) => {
  res.json(listImportFiles());
});

router.post('/', async (req, res) => {
  const { podcastId, groupId, files, defaults = {} } = req.body;
  if (!podcastId) return res.status(400).json({ error: 'podcastId required' });
  if (!Array.isArray(files) || files.length === 0) return res.status(400).json({ error: 'files array required' });

  const podcast = getPodcasts().find(p => p.id === podcastId);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

  const audioDest = join(mediaDir, 'audio');
  if (!existsSync(audioDest)) mkdirSync(audioDest, { recursive: true });

  const results = [];
  const existingSlugs = new Set(getEpisodes(podcastId).map(e => e.slug));

  for (const filename of files) {
    const src = join(importDir, filename);
    if (!existsSync(src)) {
      results.push({ filename, status: 'skipped', reason: 'not found' });
      continue;
    }

    const baseName = basename(filename, extname(filename));
    let slug = slugify(baseName);
    let counter = 1;
    while (existingSlugs.has(slug)) {
      slug = `${slugify(baseName)}-${counter}`;
      counter++;
    }
    existingSlugs.add(slug);

    const destName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(filename)}`;
    const dest = join(audioDest, destName);
    renameSync(src, dest);

    const mimeType = extname(filename).toLowerCase() === '.mp3' ? 'audio/mpeg' : 'audio/mpeg';

    let duration = 0;
    try {
      duration = Math.round(await getAudioDurationInSeconds(dest));
    } catch (err) {
      console.warn('Could not detect duration for', filename, err.message);
    }

    const stat = statSync(dest);

    let peaksUrl = '';
    try {
      const peaks = await writePeaksFile(dest, join(mediaDir, 'peaks'));
      peaksUrl = peaks.url;
    } catch (err) {
      console.warn('Could not generate peaks for', filename, err.message);
    }

    const episode = createEpisode({
      podcastId,
      groupId: groupId || '',
      title: defaults.title || baseName,
      slug,
      description: defaults.description || '',
      audioUrl: `/media/audio/${destName}`,
      peaksUrl,
      mimeType,
      fileSize: stat.size,
      duration,
      publishedAt: defaults.publishedAt || new Date().toISOString(),
      explicit: defaults.explicit || false,
      draft: defaults.draft || false,
      tags: defaults.tags || [],
      chapters: defaults.chapters || [],
      artwork: defaults.artwork || podcast.artwork || ''
    });

    results.push({ filename, status: 'imported', episode });
  }

  res.status(201).json({ imported: results.length, results });
});

export default router;
