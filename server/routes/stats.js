import { Router } from 'express';
import geoip from 'geoip-lite';
import { getStats, addStat, getEpisodeBySlug, getAll } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function clientInfo(req) {
  const ip = req.clientIp || req.ip || '';
  const geo = ip ? geoip.lookup(ip) : null;
  return {
    ip,
    country: geo?.country || null,
    region: geo?.region || null,
    city: geo?.city || null,
    ll: geo?.ll || null,
    userAgent: req.headers['user-agent'] || '',
    referer: req.headers.referer || ''
  };
}

router.post('/episodes/:id/play', (req, res) => {
  const info = clientInfo(req);
  addStat({
    type: 'play',
    episodeId: req.params.id,
    podcastId: req.body?.podcastId || null,
    ...info
  });
  res.json({ ok: true });
});

router.post('/episodes/:id/download', (req, res) => {
  const info = clientInfo(req);
  addStat({
    type: 'download',
    episodeId: req.params.id,
    podcastId: req.body?.podcastId || null,
    ...info
  });
  res.json({ ok: true });
});

router.get('/stats', requireAuth, (_req, res) => {
  const stats = getStats();
  const episodes = getAll().episodes || [];
  const byEpisode = {};
  stats.forEach(s => {
    const key = s.episodeId;
    if (!byEpisode[key]) {
      byEpisode[key] = { episodeId: s.episodeId, plays: 0, downloads: 0, recent: [] };
    }
    if (s.type === 'play') byEpisode[key].plays++;
    if (s.type === 'download') byEpisode[key].downloads++;
    byEpisode[key].recent.push(s);
  });
  Object.values(byEpisode).forEach(group => {
    const ep = episodes.find(e => e.id === group.episodeId);
    group.episodeTitle = ep?.title || group.episodeId;
    group.recent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    group.recent = group.recent.slice(0, 5);
  });
  res.json({ stats: Object.values(byEpisode) });
});

router.get('/stats/episodes/:id', requireAuth, (req, res) => {
  const stats = getStats().filter(s => s.episodeId === req.params.id);
  res.json({ stats });
});

export default router;
