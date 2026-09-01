import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
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
    const playlist = (row.Spotify_Playlist || '').trim();

    if (!date || episodeNum == null || !playlist) return;

    const ep = episodes.find(e => {
      const epDate = normalizeDate(e.publishedAt ? e.publishedAt.split('T')[0] : '');
      return epDate === date && e.episode === episodeNum;
    });

    if (!ep) {
      unmatched.push({ row: idx + 2, date, episodeNum, playlist });
      return;
    }

    ep.spotifyPlaylist = playlist;
    updated++;
  });

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  console.log(`Updated ${updated} episode(s) with Spotify playlists.`);
  if (unmatched.length) {
    console.log(`Unmatched rows (${unmatched.length}):`);
    unmatched.forEach(u => console.log(`  row ${u.row}: ${u.date} #${u.episodeNum}`));
  }
}

main();
