import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import slugify from '../server/utils/slugify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'data', 'db.json');
const csvPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(rootDir, 'Development', 'WestRadio - Omni Workdocument - Blad23.csv');

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
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

function normalizeDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return null;
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
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

function titleContains(title, theme) {
  const t = title.toLowerCase();
  const th = theme.toLowerCase();
  return t.includes(th) || th.includes(t);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const episodes = db.episodes || [];

let updated = 0;
let unmatched = [];

rows.forEach((row, idx) => {
  const date = normalizeDate((row.PublishDate || '').trim());
  const epNumStr = (row.EpisodeNumber || '').trim();
  const episodeNum = /^\d+$/.test(epNumStr) ? parseInt(epNumStr, 10) : null;
  const theme = (row.Theme || '').trim();
  const showTitle = (row['Show title'] || '').trim();

  if (!theme) return;

  let matches = episodes.filter(ep => {
    const epDate = normalizeDate(ep.publishedAt ? ep.publishedAt.split('T')[0] : '');
    if (episodeNum != null) {
      return epDate === date && ep.episode === episodeNum;
    }
    return epDate === date;
  });

  // If multiple matches and no episode number, try narrowing by show title
  if (matches.length > 1 && showTitle) {
    const narrowed = matches.filter(ep => titleContains(ep.title, showTitle));
    if (narrowed.length === 1) matches = narrowed;
  }

  if (matches.length === 0) {
    unmatched.push({ row: idx + 2, date, episodeNum, theme });
    return;
  }

  matches.forEach(ep => {
    if (titleContains(ep.title, theme)) return;
    const newTitle = `${ep.title} | ${theme}`;
    ep.title = newTitle;
    ep.slug = uniqueSlug(episodes, newTitle, ep.id, ep.podcastId);
    updated++;
  });
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`Updated ${updated} episode(s) with theme.`);
if (unmatched.length) {
  console.log(`Unmatched rows (${unmatched.length}):`);
  unmatched.forEach(u => console.log(`  row ${u.row}: ${u.date} #${u.episodeNum || '?'} - ${u.theme}`));
}
