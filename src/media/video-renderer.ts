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
  const safeSec = Math.max(0, seconds);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const cs = Math.floor((safeSec % 1) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function buildAssSubtitles(
  sound: SoundDeliverable,
  visuals: IllustratorPromptsDeliverable
): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: AlNourTikTok,DejaVu Sans,54,&H00EEF6FA,&H0044C8F6,&H00120E0C,&HAA120E0C,-1,0,0,0,100,100,1,0,1,4.5,2.5,2,70,70,235,1
Style: AlNourEduCallout,DejaVu Sans,32,&H008CD99E,&H0044C8F6,&H00120E0C,&HC8161310,-1,0,0,0,100,100,0.5,0,3,10,0,2,90,90,1360,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events: string[] = [];

  // 1. Animated Educational Pop-in Callouts synchronized per scene
  let cumulativeSec = 0;
  for (const sc of visuals.scenes) {
    const startSec = cumulativeSec + 0.25;
    const endSec = cumulativeSec + sc.durationSec - 0.2;
    cumulativeSec += sc.durationSec;

    const edu = sc.educationalOverlay;
    if (edu && endSec > startSec) {
      const calloutText = edu.phonetic
        ? `✦ ${edu.phonetic.replace(/[{}]/g, '')} ✦`
        : `✦ ${edu.badgeTitle.replace(/[{}]/g, '')} ✦`;
      events.push(
        `Dialogue: 1,${formatAssTime(startSec)},${formatAssTime(endSec)},AlNourEduCallout,,0,0,0,,{\\fad(320,280)}${calloutText}`
      );
    }
  }

  // 2. Dynamic Word-by-Word Karaoke Subtitles with 3D Scale Pop & Gold Highlight
  const words = sound.wordTimestamps;
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
            return `{\\c&H0044C8F6&\\fscx109\\fscy109\\b1}${cleanWord}{\\fscx100\\fscy100\\c&H00EEF6FA&}`;
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
  const videoOutName = `${episodeId}_final_${timestamp}.mp4`;
  const videoOutPath = path.join(OUTPUT_DIR, videoOutName);

  // 1. Write ASS Subtitle + Animated Educational Callout file
  fs.writeFileSync(assPath, buildAssSubtitles(sound, visuals), 'utf-8');

  const audioDiskPath = path.join(OUTPUT_DIR, sound.audioFileUrl.replace(/^\/media\//, ''));
  const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  // 2. Build Proactive 2.5D/3D Camera Motion Filtergraph across all valid scenes
  const validScenes = visuals.scenes
    .map(sc => {
      const relName = (sc.imageUrl || '').replace(/^\/media\//, '');
      const imgDiskPath = path.join(OUTPUT_DIR, relName);
      return { scene: sc, imgDiskPath };
    })
    .filter(item => fs.existsSync(item.imgDiskPath));

  if (validScenes.length > 0) {
    const ffmpegArgs: string[] = ['-y'];
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    // Scale total visual duration proportionally to match actual spoken audio duration
    const totalNominalSec = validScenes.reduce((acc, s) => acc + s.scene.durationSec, 0) || 48;
    const scaleFactor = sound.durationSec > 5 ? sound.durationSec / totalNominalSec : 1;

    validScenes.forEach((item, idx) => {
      const dur = Math.max(2.5, Number((item.scene.durationSec * scaleFactor).toFixed(2)));
      ffmpegArgs.push('-loop', '1', '-framerate', '24', '-t', String(dur), '-i', item.imgDiskPath);

      const motion = item.scene.cameraMotion;
      let cropFilter = '';
      if (motion === 'zoom_in') {
        // Gentle upward & inward 2.5D glide
        cropFilter = `scale=1166:2072,crop=1080:1920:'43+24*sin(t*0.65)':'115-14*t'`;
      } else if (motion === 'pan_right') {
        // Smooth horizontal parallax pan across the HLM room
        cropFilter = `scale=1188:2112,crop=1080:1920:'18+14*t':'96+20*sin(t*0.55)'`;
      } else {
        // Organic 3D camera breathing
        cropFilter = `scale=1156:2056,crop=1080:1920:'38+22*sin(t*0.75)':'68+24*cos(t*0.65)'`;
      }

      filterParts.push(
        `[${idx}:v]${cropFilter},fade=t=in:st=0:d=0.28,setsar=1,format=yuv420p[v${idx}]`
      );
      concatInputs.push(`[v${idx}]`);
    });

    const audioInputIdx = validScenes.length;
    ffmpegArgs.push('-i', audioDiskPath);

    const fullFilterComplex =
      filterParts.join(';') +
      `;${concatInputs.join('')}concat=n=${validScenes.length}:v=1:a=0,subtitles='${escapedAssPath}'[vout]`;

    ffmpegArgs.push(
      '-filter_complex',
      fullFilterComplex,
      '-map',
      '[vout]',
      '-map',
      `${audioInputIdx}:a`,
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
    );

    await execFileAsync('ffmpeg', ffmpegArgs);
  }

  const stats = fs.statSync(videoOutPath);
  const fileSizeMb = Number((stats.size / (1024 * 1024)).toFixed(2));

  return {
    videoFileUrl: `/media/${videoOutName}`,
    resolution: '1080x1920 (9:16 Vertical TikTok • Caméra 2.5D/3D + Cartes Éducatives)',
    durationSec: sound.durationSec,
    fps: 24,
    subtitleStyle:
      'Cartes Éducatives 3D (Arabe vocalisé, Hadîth, Du’a, Geste Al Nour) + Karaoké Doré Dynamique (#F6C844)',
    fileSizeMb,
    readyForTikTok: true
  };
}
