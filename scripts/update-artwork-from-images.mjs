import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'data', 'db.json');
const imagesDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(rootDir, 'Development', 'Images');
const artworkDir = path.join(rootDir, 'media', 'artwork');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const episodes = db.episodes || [];

const files = fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f));
const normalize = value => value.toLowerCase().replace(/[^a-z0-9.]+/g, '');

let updated = 0;
let unmatched = [];

files.forEach(file => {
  const base = path.parse(file).name;
  // Expect "Name 001" or "Name 099.5"
  const match = base.match(/^(.+?)[.\s]+([\d.]+|VI|VII)$/i);
  if (!match) {
    unmatched.push({ file, reason: 'could not parse name/number' });
    return;
  }

  const showName = match[1].replace(/([a-z])([A-Z])/g, '$1 $2');
  const numStr = match[2];
  const romanNumbers = { VI: 6, VII: 7 };
  const numeric = romanNumbers[numStr.toUpperCase()] || parseFloat(numStr);
  const westradioPodcastId = '0616f2cb-7547-42cb-97b1-6f1ab054c009';

  const normalizedShow = normalize(showName);

  // Prefer matching by episode number + WestRadio title prefix within the podcast
  let matches = episodes.filter(ep =>
    ep.podcastId === westradioPodcastId &&
    ep.episode === numeric &&
    ep.title &&
    normalize(ep.title).startsWith(normalizedShow)
  );

  // Fallback to title matching (for non-integer or missing episode numbers)
  if (matches.length === 0) {
    const expectedPrefix = normalize(`${showName}${numStr}`);
    matches = episodes.filter(ep =>
      ep.title && normalize(ep.title).startsWith(expectedPrefix)
    );
  }

  if (matches.length === 0) {
    unmatched.push({ file, reason: 'no matching episode' });
    return;
  }

  if (matches.length > 1) {
    unmatched.push({ file, reason: `multiple matches (${matches.length})` });
    return;
  }

  const ep = matches[0];
  const safeName = `${showName.toLowerCase().replace(/\s+/g, '-')}-${numStr}${path.extname(file).toLowerCase()}`;
  const destPath = path.join(artworkDir, safeName);
  fs.copyFileSync(path.join(imagesDir, file), destPath);

  ep.artwork = `/media/artwork/${safeName}`;
  updated++;
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`Updated ${updated} episode(s) with new artwork.`);
if (unmatched.length) {
  console.log(`Unmatched files (${unmatched.length}):`);
  unmatched.forEach(u => console.log(`  ${u.file}: ${u.reason}`));
}
