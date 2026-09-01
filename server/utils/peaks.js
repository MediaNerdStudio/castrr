import { spawn } from 'child_process';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

/**
 * Generate waveform peak data for an audio file using ffmpeg.
 * Outputs a JSON array of [min, max] values normalized to [-1, 1].
 * The number of peaks is based on pixelsPerSecond (default 10).
 */
export async function generatePeaks(audioPath, options = {}) {
  const { pixelsPerSecond = 10, sampleRate = 8000, channels = 1 } = options;

  // Get duration via ffprobe first
  const duration = await getDuration(audioPath);
  if (!duration || duration <= 0) {
    throw new Error('Could not determine audio duration');
  }

  const totalPixels = Math.max(1, Math.round(duration * pixelsPerSecond));
  const samplesPerPixel = Math.floor((duration * sampleRate) / totalPixels);

  const args = [
    '-i', audioPath,
    '-ar', String(sampleRate),
    '-ac', String(channels),
    '-f', 's16le',
    '-acodec', 'pcm_s16le',
    '-'
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let stderr = '';

    proc.stdout.on('data', chunk => chunks.push(chunk));
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });
    proc.on('error', reject);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(0, 200)}`));

      const buffer = Buffer.concat(chunks);
      const peaks = [];
      const sampleSize = 2; // s16le
      const bytesPerPixel = samplesPerPixel * sampleSize * channels;
      const channelPeaks = [];

      for (let i = 0; i < totalPixels; i++) {
        const offset = i * bytesPerPixel;
        const end = Math.min(offset + bytesPerPixel, buffer.length);
        let max = 0;

        for (let j = offset; j < end; j += sampleSize * channels) {
          const val = Math.abs(buffer.readInt16LE(j) / 32768);
          if (val > max) max = val;
        }

        channelPeaks.push(max);
      }

      peaks.push(channelPeaks);

      resolve({ duration, peaks, sampleRate, pixelsPerSecond, totalPixels });
    });
  });
}

function getDuration(audioPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let out = '';
    let err = '';
    proc.stdout.on('data', chunk => out += chunk.toString());
    proc.stderr.on('data', chunk => err += chunk.toString());
    proc.on('error', reject);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`ffprobe exited ${code}: ${err.slice(0, 200)}`));
      const duration = parseFloat(out.trim());
      resolve(isNaN(duration) ? 0 : duration);
    });
  });
}

export async function writePeaksFile(audioPath, peaksDir, options = {}) {
  const { peaks, duration } = await generatePeaks(audioPath, options);
  if (!existsSync(peaksDir)) mkdirSync(peaksDir, { recursive: true });

  const name = basename(audioPath, extname(audioPath)) + '.peaks.json';
  const outPath = join(peaksDir, name);
  writeFileSync(outPath, JSON.stringify({ duration, peaks }));
  return { path: outPath, url: `/media/peaks/${name}` };
}
