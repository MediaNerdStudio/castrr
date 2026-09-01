import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'data', 'db.json');
const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(rootDir, 'Development', 'WestRadio - Omni Workdocument - Blad23.csv');

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

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const episodes = db.episodes || [];
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));

let mismatches = [];
let unmatched = [];

rows.forEach((row, idx) => {
  const date = normalizeDate((row.PublishDate || '').trim());
  const epNumStr = (row.EpisodeNumber || '').trim();
  const episodeNum = /^\d+$/.test(epNumStr) ? parseInt(epNumStr, 10) : null;
  const title = (row['Show title'] || '').trim();
  const filename = (row.Filename || '').trim();

  if (!date && episodeNum == null) return;

  let matches = episodes.filter(ep => {
    const epDate = normalizeDate(ep.publishedAt ? ep.publishedAt.split('T')[0] : '');
    return epDate === date && (episodeNum == null || ep.episode === episodeNum);
  });

  if (matches.length === 0) {
    unmatched.push({ row: idx + 2, filename, title });
    return;
  }

  if (matches.length > 1) {
    mismatches.push({ row: idx + 2, issue: 'multiple matches', title, matches: matches.map(e => ({ id: e.id, title: e.title, slug: e.slug, episode: e.episode, date: e.publishedAt })) });
    return;
  }

  const ep = matches[0];
  if (title && ep.title !== title) {
    mismatches.push({ row: idx + 2, issue: 'title mismatch', csv: title, db: ep.title, slug: ep.slug });
  }
});

console.log(`Total CSV rows: ${rows.length}`);
console.log(`Total episodes: ${episodes.length}`);
console.log(`Unmatched: ${unmatched.length}`);
unmatched.forEach(u => console.log(`  row ${u.row}: ${u.filename || u.title}`));
console.log(`Mismatches: ${mismatches.length}`);
mismatches.slice(0, 20).forEach(m => console.log(`  row ${m.row}: ${m.issue} - ${JSON.stringify(m)}`));
if (mismatches.length > 20) console.log(`  ... and ${mismatches.length - 20} more`);
