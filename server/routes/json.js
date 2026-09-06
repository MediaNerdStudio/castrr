import express from 'express';
import { getPodcasts, getEpisodes } from '../db.js';

const router = express.Router();

function getBaseUrl(req) {
  return (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function absoluteUrl(baseUrl, value, fallback = '') {
  if (!value) return fallback ? absoluteUrl(baseUrl, fallback) : '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}/${String(value).replace(/^\/+/, '')}`;
}

function serializeGroup(group, podcast, baseUrl) {
  return {
    id: group.id,
    slug: group.slug,
    title: group.title,
    description: group.description || '',
    type: group.type || 'season',
    artworkUrl: absoluteUrl(baseUrl, group.artwork || podcast.artwork, '/default-cover.svg'),
    pageUrl: `${baseUrl}/podcast/${podcast.slug}`,
    rssUrl: `${baseUrl}/api/rss/${podcast.slug}/${group.slug}`,
    jsonUrl: `${baseUrl}/api/json/${podcast.slug}/${group.slug}`
  };
}

function serializeEpisode(episode, podcast, baseUrl) {
  return {
    id: episode.id,
    slug: episode.slug,
    title: episode.title,
    description: episode.description || '',
    publishedAt: episode.publishedAt,
    duration: episode.duration || 0,
    episode: episode.episode ?? null,
    season: episode.season ?? null,
    episodeType: episode.episodeType || 'full',
    explicit: Boolean(episode.explicit),
    mimeType: episode.mimeType || 'audio/mpeg',
    fileSize: episode.fileSize || 0,
    tags: episode.tags || [],
    chapters: episode.chapters || [],
    spotifyPlaylist: episode.spotifyPlaylist || '',
    groupId: episode.groupId || null,
    audioUrl: absoluteUrl(baseUrl, episode.audioUrl),
    artworkUrl: absoluteUrl(baseUrl, episode.artwork || podcast.artwork, '/default-cover.svg'),
    peaksUrl: absoluteUrl(baseUrl, episode.peaksUrl),
    pageUrl: `${baseUrl}/podcast/${podcast.slug}/episode/${episode.slug}`
  };
}

function buildResponse(req, podcast, group = null) {
  const baseUrl = getBaseUrl(req);
  const episodes = getEpisodes(podcast.id)
    .filter(episode => !episode.draft && (!group || episode.groupId === group.id))
    .map(episode => serializeEpisode(episode, podcast, baseUrl));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    podcast: {
      id: podcast.id,
      slug: podcast.slug,
      title: podcast.title,
      description: podcast.description || '',
      author: podcast.author || '',
      language: podcast.language || 'en',
      explicit: Boolean(podcast.explicit),
      categories: podcast.categories || [],
      tags: podcast.tags || [],
      artworkUrl: absoluteUrl(baseUrl, podcast.artwork, '/default-cover.svg'),
      pageUrl: `${baseUrl}/podcast/${podcast.slug}`,
      rssUrl: `${baseUrl}/api/rss/${podcast.slug}`,
      jsonUrl: `${baseUrl}/api/json/${podcast.slug}`,
      groups: (podcast.groups || []).map(item => serializeGroup(item, podcast, baseUrl))
    },
    group: group ? serializeGroup(group, podcast, baseUrl) : null,
    episodeCount: episodes.length,
    episodes
  };
}

router.get('/:slug', (req, res) => {
  const podcast = getPodcasts().find(item => item.slug === req.params.slug && !item.hidden);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });
  res.json(buildResponse(req, podcast));
});

router.get('/:slug/:groupSlug', (req, res) => {
  const podcast = getPodcasts().find(item => item.slug === req.params.slug && !item.hidden);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });
  const group = (podcast.groups || []).find(item => item.slug === req.params.groupSlug);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(buildResponse(req, podcast, group));
});

export default router;
