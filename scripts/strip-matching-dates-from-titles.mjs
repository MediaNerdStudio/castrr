import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import slugify from '../server/utils/slugify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'data', 'db.json');

function normalizeDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return null;
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseDateInTitle(title) {
  const match = title.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return normalizeDate(`${match[1]}-${match[2]}-${match[3]}`);
}

function uniqueSlug(episodes, title, currentId, podcastId) {
  let baseSlug = slugify(title);
  let candidate = baseSlug;
  let counter = 2;
  while (
    episodes.some(
      e => e.id !== currentId && e.podcastId === podcastId && e.slug === candidate
    )
  ) {
    candidate = `${baseSlug}-${counter}`;
    counter++;
  }
  return candidate;
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const episodes = db.episodes || [];

let updated = 0;

episodes.forEach(ep => {
  const publishedDate = normalizeDate(ep.publishedAt ? ep.publishedAt.split('T')[0] : '');
  if (!publishedDate) return;

  let title = ep.title;
  let original = title;

  // Strip a leading date like "2020-03-29 WestRadio 032"
  title = title.replace(new RegExp(`^\\s*${publishedDate.replace(/-/g, '\\-')}\\s+`, 'i'), '');

  // Strip a trailing " | (2026-08-27)" or "(2026-08-27)"
  title = title.replace(new RegExp(`\\s*[\\|\\-]?\\s*\\(\\s*${publishedDate.replace(/-/g, '\\-')}\\s*\\)\\s*$`, 'i'), '');

  // Strip a trailing bare date " 2026-08-27"
  title = title.replace(new RegExp(`\\s+${publishedDate.replace(/-/g, '\\-')}\\s*$`, 'i'), '');

  title = title.replace(/\s+/g, ' ').trim();

  // Extra safety: if a date remains and matches published date, remove the whole date token
  const remainingDate = parseDateInTitle(title);
  if (remainingDate === publishedDate) {
    title = title.replace(new RegExp(`\\s*${publishedDate.replace(/-/g, '\\-')}\\s*`, 'i'), ' ').replace(/\s+/g, ' ').trim();
  }

  if (title === original) return;

  ep.title = title;
  ep.slug = uniqueSlug(episodes, title, ep.id, ep.podcastId);
  updated++;
  console.log(`Updated: "${original}" -> "${title}"`);
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log(`\nUpdated ${updated} episode(s).`);
