import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const dataDir = process.env.DATA_DIR
  ? (process.env.DATA_DIR.startsWith('.') ? join(rootDir, process.env.DATA_DIR) : process.env.DATA_DIR)
  : join(rootDir, 'data');
const dbPath = join(dataDir, 'db.json');

const defaultData = {
  podcasts: [],
  episodes: [],
  stats: [],
  settings: {
    siteTitle: 'Casterr',
    siteDescription: 'Self-hosted podcast platform'
  }
};

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

function read() {
  if (!existsSync(dbPath)) {
    write(defaultData);
    return { ...defaultData };
  }
  try {
    return JSON.parse(readFileSync(dbPath, 'utf8'));
  } catch {
    return { ...defaultData };
  }
}

function write(data) {
  writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function getAll() {
  return read();
}

export function getPodcasts() {
  return read().podcasts;
}

export function getPodcastBySlug(slug) {
  return read().podcasts.find(p => p.slug === slug);
}

export function createPodcast(podcast) {
  const data = read();
  podcast.id = crypto.randomUUID();
  podcast.createdAt = new Date().toISOString();
  podcast.updatedAt = podcast.createdAt;
  data.podcasts.push(podcast);
  write(data);
  return podcast;
}

export function updatePodcast(id, update) {
  const data = read();
  const idx = data.podcasts.findIndex(p => p.id === id);
  if (idx === -1) return null;
  data.podcasts[idx] = { ...data.podcasts[idx], ...update, updatedAt: new Date().toISOString() };
  write(data);
  return data.podcasts[idx];
}

export function deletePodcast(id) {
  const data = read();
  data.podcasts = data.podcasts.filter(p => p.id !== id);
  data.episodes = data.episodes.filter(e => e.podcastId !== id);
  write(data);
}

export function getEpisodes(podcastId) {
  const data = read();
  return data.episodes
    .filter(e => e.podcastId === podcastId)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export function getEpisodeBySlug(slug) {
  return read().episodes.find(e => e.slug === slug);
}

export function createEpisode(episode) {
  const data = read();
  episode.id = crypto.randomUUID();
  episode.createdAt = new Date().toISOString();
  episode.updatedAt = episode.createdAt;
  data.episodes.push(episode);
  write(data);
  return episode;
}

export function updateEpisode(id, update) {
  const data = read();
  const idx = data.episodes.findIndex(e => e.id === id);
  if (idx === -1) return null;
  data.episodes[idx] = { ...data.episodes[idx], ...update, updatedAt: new Date().toISOString() };
  write(data);
  return data.episodes[idx];
}

export function deleteEpisode(id) {
  const data = read();
  data.episodes = data.episodes.filter(e => e.id !== id);
  write(data);
}

export function getSettings() {
  return read().settings;
}

export function updateSettings(settings) {
  const data = read();
  data.settings = { ...data.settings, ...settings };
  write(data);
  return data.settings;
}

export function getStats() {
  return read().stats || [];
}

export function addStat(record) {
  const data = read();
  if (!data.stats) data.stats = [];
  data.stats.push({ id: crypto.randomUUID(), ...record, createdAt: new Date().toISOString() });
  write(data);
  return record;
}
