import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import {
  IllustratorPromptsDeliverable,
  SoundDeliverable,
  VideoDeliverable
} from '../harness/types.js';

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'media');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function formatAssTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function buildAssSubtitles(sound: SoundDeliverable): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: AlNourTikTok,DejaVu Sans,56,&H00EEF6FA,&H0044C8F6,&H00141012,&H96141012,-1,0,0,0,100,100,1,0,1,4,2,2,80,80,310,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Group words by chunks of 4 and highlight active word in warm gold (&H0044C8F6 in BGR)
  const words = sound.wordTimestamps;
  const events: string[] = [];
  const chunkSize = 4;

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    for (let activeIdx = 0; activeIdx < chunk.length; activeIdx++) {
      const w = chunk[activeIdx];
      const start = formatAssTime(w.startSec);
      const end = formatAssTime(w.endSec);

      const formattedChunk = chunk
        .map((item, j) => {
          const cleanWord = item.word.replace(/[{}]/g, '');
          if (j === activeIdx) {
            return `{\\c&H0044C8F6&\\b1}${cleanWord}{\\c&H00EEF6FA&}`;
          }
          return cleanWord;
        })
        .join(' ');

      events.push(`Dialogue: 0,${start},${end},AlNourTikTok,,0,0,0,,${formattedChunk}`);
    }
  }

  return header + events.join('\n') + '\n';
}

export async function renderFinalTikTokVideo(
  episodeId: string,
  visuals: IllustratorPromptsDeliverable,
  sound: SoundDeliverable
): Promise<VideoDeliverable> {
  const timestamp = Date.now();
  const assPath = path.join(OUTPUT_DIR, `${episodeId}_subs_${timestamp}.ass`);
  const concatListPath = path.join(OUTPUT_DIR, `${episodeId}_concat_${timestamp}.txt`);
  const videoOutName = `${episodeId}_final_${timestamp}.mp4`;
  const videoOutPath = path.join(OUTPUT_DIR, videoOutName);

  // 1. Write ASS Subtitle file with golden Al Nour highlights
  fs.writeFileSync(assPath, buildAssSubtitles(sound), 'utf-8');

  // 2. Build FFmpeg concat demuxer list from the 1080x1920 PNG scenes
  const concatLines: string[] = [];
  let lastImgDiskPath = '';

  for (const scene of visuals.scenes) {
    const relName = (scene.imageUrl || '').replace(/^\/media\//, '');
    const imgDiskPath = path.join(OUTPUT_DIR, relName);
    if (fs.existsSync(imgDiskPath)) {
      lastImgDiskPath = imgDiskPath;
      concatLines.push(`file '${imgDiskPath.replace(/'/g, "'\\''")}'`);
      concatLines.push(`duration ${scene.durationSec}`);
    }
  }

  if (lastImgDiskPath) {
    concatLines.push(`file '${lastImgDiskPath.replace(/'/g, "'\\''")}'`);
  }

  fs.writeFileSync(concatListPath, concatLines.join('\n'), 'utf-8');

  const audioDiskPath = path.join(OUTPUT_DIR, sound.audioFileUrl.replace(/^\/media\//, ''));
  const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  // 3. Render 9:16 MP4 with burned-in golden ASS subtitles + mixed audio
  await execFileAsync('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-i',
    audioDiskPath,
    '-vf',
    `scale=1080:1920,subtitles='${escapedAssPath}'`,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-pix_fmt',
    'yuv420p',
    '-r',
    '24',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-shortest',
    videoOutPath
  ]);

  const stats = fs.statSync(videoOutPath);
  const fileSizeMb = Number((stats.size / (1024 * 1024)).toFixed(2));

  try {
    fs.unlinkSync(concatListPath);
  } catch {
    // ignore cleanup error
  }

  return {
    videoFileUrl: `/media/${videoOutName}`,
    resolution: '1080x1920 (9:16 Vertical TikTok)',
    durationSec: sound.durationSec,
    fps: 24,
    subtitleStyle: 'Groupes de 4 mots en zone sécurisée TikTok + Surbrillance dorée Al Nour (#F6C844)',
    fileSizeMb,
    readyForTikTok: true
  };
}
