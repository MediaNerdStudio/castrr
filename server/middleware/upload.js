import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..', '..');
const mediaDir = process.env.MEDIA_DIR
  ? (process.env.MEDIA_DIR.startsWith('.') ? resolve(rootDir, process.env.MEDIA_DIR) : resolve(process.env.MEDIA_DIR))
  : join(rootDir, 'media');

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function storage(subfolder) {
  const dest = join(mediaDir, subfolder);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`;
      cb(null, name);
    }
  });
}

function fileFilter(allowed) {
  return (_req, file, cb) => {
    cb(null, allowed.includes(file.mimetype));
  };
}

export const uploadArtwork = multer({
  storage: storage('artwork'),
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const uploadAudio = multer({
  storage: storage('audio'),
  fileFilter: fileFilter(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/aac']),
  limits: { fileSize: 1024 * 1024 * 1024 }
});
