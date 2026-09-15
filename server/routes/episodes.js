import express from 'express';
import { existsSync, statSync } from 'fs';
import { getPodcasts } from '../db.js';
import { getEpisodes, getEpisodeBySlug, createEpisode, updateEpisode, deleteEpisode } from '../db.js';
import slugify from '../utils/slugify.js';
import { enrichTracklist, spotifyConfigured } from '../utils/spotify.js';

const router = express.Router();

import { getAll } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

router.get('/', (_req, res) => res.json(getAll().episodes));

router.get('/by-podcast/:podcastSlug', (req, res) => {
  const podcast = getPodcasts().find(p => p.slug === req.params.podcastSlug);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });
  res.json(getEpisodes(podcast.id));
});

router.get('/by-podcast-id/:podcastId', (req, res) => {
  const podcast = getPodcasts().find(p => p.id === req.params.podcastId);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });
  res.json(getEpisodes(podcast.id));
});

router.get('/id/:id', (req, res) => {
  const episode = getAll().episodes.find(e => e.id === req.params.id);
  if (!episode) return res.status(404).json({ error: 'Not found' });
  res.json(episode);
});

router.get('/slug/:slug', (req, res) => {
  const episode = getEpisodeBySlug(req.params.slug);
  if (!episode) return res.status(404).json({ error: 'Not found' });
  res.json(episode);
});

router.post('/', requireAuth, async (req, res) => {
  const data = req.body;
  if (!data.title || !data.podcastId) {
    return res.status(400).json({ error: 'Title and podcastId required' });
  }
  if (Array.isArray(data.tracklist)) {
    await enrichTracklist(data.tracklist);
  }
  data.slug = slugify(data.slug || data.title);
  if (getEpisodes(data.podcastId).some(e => e.slug === data.slug)) {
    return res.status(409).json({ error: 'Slug already exists for this podcast' });
  }
  res.status(201).json(createEpisode(data));
});

router.put('/:id', requireAuth, async (req, res) => {
  const data = req.body;
  if (Array.isArray(data.tracklist)) {
    await enrichTracklist(data.tracklist);
  }
  if (data.slug) data.slug = slugify(data.slug);
  const episode = updateEpisode(req.params.id, data);
  if (!episode) return res.status(404).json({ error: 'Not found' });
  res.json(episode);
});

router.delete('/:id', requireAuth, (req, res) => {
  deleteEpisode(req.params.id);
  res.status(204).send();
});

router.post('/:id/enrich-tracklist', requireAuth, async (req, res) => {
  if (!spotifyConfigured()) {
    return res.status(400).json({ error: 'Spotify is not configured' });
  }
  const data = getAll();
  const episode = data.episodes.find(e => e.id === req.params.id);
  if (!episode) return res.status(404).json({ error: 'Not found' });
  if (!Array.isArray(episode.tracklist) || episode.tracklist.length === 0) {
    return res.status(400).json({ error: 'No tracklist' });
  }
  await enrichTracklist(episode.tracklist);
  const updated = updateEpisode(req.params.id, { tracklist: episode.tracklist });
  res.json(updated);
});

export default router;
