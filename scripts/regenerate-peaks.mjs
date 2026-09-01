import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { writePeaksFile } from '../server/utils/peaks.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const dbPath = join(rootDir, 'data', 'db.json');

const db = JSON.parse(readFileSync(dbPath, 'utf8'));

for (const episode of db.episodes) {
  if (episode.audioUrl) {
    const audioPath = join(rootDir, episode.audioUrl.replace(/^\//, ''));
    try {
      const result = await writePeaksFile(audioPath, join(rootDir, 'media', 'peaks'));
      episode.peaksUrl = result.url;
      console.log('Generated peaks for', episode.title);
    } catch (err) {
      console.warn('Failed peaks for', episode.title, err.message);
    }
  }
}

writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Done');
