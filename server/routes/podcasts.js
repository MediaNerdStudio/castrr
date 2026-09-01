import express from 'express';
import slugify from '../utils/slugify.js';
import { getPodcasts, getPodcastBySlug, createPodcast, updatePodcast, deletePodcast } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function normalizeGroups(groups = []) {
  return groups
    .filter(g => g.title || g.name)
    .map(g => ({
      id: g.id || crypto.randomUUID(),
      slug: slugify(g.slug || g.title || g.name),
      title: g.title || g.name,
      description: g.description || '',
      type: g.type || 'season',
      artwork: g.artwork || ''
    }));
}

router.get('/', (_req, res) => res.json(getPodcasts()));

router.get('/public', (_req, res) => res.json(getPodcasts().filter(p => !p.hidden)));

router.get('/:slug', (req, res) => {
  const podcast = getPodcastBySlug(req.params.slug);
  if (!podcast) return res.status(404).json({ error: 'Not found' });
  res.json(podcast);
});

router.post('/', requireAuth, (req, res) => {
  const data = req.body;
  if (!data.title) return res.status(400).json({ error: 'Title required' });
  data.slug = slugify(data.slug || data.title);
  if (getPodcasts().some(p => p.slug === data.slug)) {
    return res.status(409).json({ error: 'Slug already exists' });
  }
  data.groups = normalizeGroups(data.groups);
  res.status(201).json(createPodcast(data));
});

router.put('/:id', requireAuth, (req, res) => {
  const data = req.body;
  if (data.slug) data.slug = slugify(data.slug);
  if (data.groups) data.groups = normalizeGroups(data.groups);
  const podcast = updatePodcast(req.params.id, data);
  if (!podcast) return res.status(404).json({ error: 'Not found' });
  res.json(podcast);
});

router.delete('/:id', requireAuth, (req, res) => {
  deletePodcast(req.params.id);
  res.status(204).send();
});

export default router;
