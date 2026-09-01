import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import slugify from '../server/utils/slugify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'data', 'db.json');
const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(rootDir, 'Development', 'WestRadio - Omni Workdocument - Blad23.csv');

function readDb() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line, idx) => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = values[i] || '');
    return row;
  });
}

function parseLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/\.mp3$/i, '').trim();
}

function toIsoDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return null;
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00.000Z`;
}

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const db = readDb();
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const episodes = db.episodes || [];
  const podcasts = db.podcasts || [];
  const westradio = podcasts.find(p => p.slug === 'westradio');

  let updated = 0;
  let unmatched = [];

  rows.forEach((row, idx) => {
    const filename = (row.Filename || '').trim();
    const title = (row['Show title'] || '').trim();
    const description = (row.Description || '').trim();
    const date = toIsoDate((row.PublishDate || '').trim());
    const episodeNumStr = (row.EpisodeNumber || '').trim();
    const episodeNum = /^\d+$/.test(episodeNumStr) ? parseInt(episodeNumStr, 10) : null;

    if (!filename && !title) return;

    const needle = normalizeTitle(filename || title);
    const ep = episodes.find(e => normalizeTitle(e.title).includes(needle) || needle.includes(normalizeTitle(e.title)));

    if (!ep) {
      unmatched.push({ row: idx + 2, filename, title });
      return;
    }

    if (title) ep.title = title;
    if (description) ep.description = description;
    if (date) ep.publishedAt = date;
    if (episodeNum != null) ep.episode = episodeNum;

    // Regenerate slug from new title, keeping it unique per podcast
    if (title) {
      let baseSlug = slugify(title);
      let candidate = baseSlug;
      let counter = 2;
      while (
        episodes.some(
          e => e.id !== ep.id && e.podcastId === ep.podcastId && e.slug === candidate
        )
      ) {
        candidate = `${baseSlug}-${counter}`;
        counter++;
      }
      ep.slug = candidate;
    }

    updated++;
    console.log(`Updated: ${ep.title}`);
  });

  writeDb(db);

  console.log(`\nUpdated ${updated} episode(s).`);
  if (unmatched.length) {
    console.log(`Unmatched rows (${unmatched.length}):`);
    unmatched.forEach(u => console.log(`  row ${u.row}: ${u.filename || u.title}`));
  }
}

main();
