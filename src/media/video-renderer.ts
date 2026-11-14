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
Style: AlNourEduCallout,DejaVu Sans,30,&H008CD99E,&H0044C8F6,&H00120E0C,&HC8161310,-1,0,0,0,100,100,0.5,0,3,10,0,2,90,90,1365,1
Style: AlNourLightMote,DejaVu Sans,28,&H6698E2FF,&H6644C8F6,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events: string[] = [];

  // 1. Floating Golden Light Motes & Sunbeam Dust (Animated Cinema Atmosphere across the episode)
  const totalDur = Math.max(12, sound.durationSec || 48);
  const particleCount = Math.min(36, Math.floor(totalDur * 0.75));
  for (let p = 0; p < particleCount; p++) {
    const startSec = Number(((p * (totalDur / particleCount)) % Math.max(1, totalDur - 4)).toFixed(2));
    const endSec = Math.min(totalDur, startSec + 4.2);
    const x1 = 120 + ((p * 197) % 840);
    const y1 = 1280 - ((p * 131) % 680);
    const x2 = x1 + (p % 2 === 0 ? 48 : -44);
    const y2 = y1 - 135;
    const symbol = p % 3 === 0 ? '✦' : '•';
    events.push(
      `Dialogue: 0,${formatAssTime(startSec)},${formatAssTime(endSec)},AlNourLightMote,,0,0,0,,{\\move(${x1},${y1},${x2},${y2})\\fad(900,900)}${symbol}`
    );
  }

  // 2. Animated Callouts ONLY on scenes that actually have an Educational Overlay
  const totalNominalSec = visuals.scenes.reduce((acc, s) => acc + s.durationSec, 0) || 48;
  const scaleFactor = sound.durationSec > 5 ? sound.durationSec / totalNominalSec : 1;

  let cumulativeSec = 0;
  for (const sc of visuals.scenes) {
    const scaledDur = sc.durationSec * scaleFactor;
    const startSec = cumulativeSec + 0.55;
    const endSec = cumulativeSec + scaledDur - 0.25;
    cumulativeSec += scaledDur;

    const edu = sc.educationalOverlay;
    if (edu && !sc.disableEducationalCard && endSec > startSec) {
      const calloutText = edu.phonetic
        ? `✦ ${edu.phonetic.replace(/[{}]/g, '')} ✦`
        : `✦ ${edu.badgeTitle.replace(/[{}]/g, '')} ✦`;
      events.push(
        `Dialogue: 1,${formatAssTime(startSec)},${formatAssTime(endSec)},AlNourEduCallout,,0,0,0,,{\\fad(420,320)}${calloutText}`
      );
    }
  }

  // 3. Dynamic Word-by-Word Karaoke Subtitles with 3D Scale Pop & Gold Highlight
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

      events.push(`Dialogue: 2,${start},${end},AlNourTikTok,,0,0,0,,${formattedChunk}`);
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

  // 1. Write ASS Subtitle + Floating Golden Particles + Selective Educational Callouts
  fs.writeFileSync(assPath, buildAssSubtitles(sound, visuals), 'utf-8');

  const audioDiskPath = path.join(OUTPUT_DIR, sound.audioFileUrl.replace(/^\/media\//, ''));
  const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  // 2. Build Multi-Layer 3D Parallax + Animated Lighting + Animated Card Slide-In Filtergraph
  const validScenes = visuals.scenes
    .map(sc => {
      const relName = (sc.imageUrl || '').replace(/^\/media\//, '');
      const imgDiskPath = path.join(OUTPUT_DIR, relName);
      const bgDiskPath = sc.bgLayerUrl
        ? path.join(OUTPUT_DIR, sc.bgLayerUrl.replace(/^\/media\//, ''))
        : '';
      const fgDiskPath = sc.fgLayerUrl
        ? path.join(OUTPUT_DIR, sc.fgLayerUrl.replace(/^\/media\//, ''))
        : '';
      const cardDiskPath =
        sc.cardLayerUrl && sc.educationalOverlay && !sc.disableEducationalCard
          ? path.join(OUTPUT_DIR, sc.cardLayerUrl.replace(/^\/media\//, ''))
          : '';
      return {
        scene: sc,
        imgDiskPath,
        bgDiskPath: bgDiskPath && fs.existsSync(bgDiskPath) ? bgDiskPath : '',
        fgDiskPath: fgDiskPath && fs.existsSync(fgDiskPath) ? fgDiskPath : '',
        cardDiskPath: cardDiskPath && fs.existsSync(cardDiskPath) ? cardDiskPath : ''
      };
    })
    .filter(item => fs.existsSync(item.imgDiskPath));

  if (validScenes.length > 0) {
    const ffmpegArgs: string[] = ['-y'];
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    const totalNominalSec = validScenes.reduce((acc, s) => acc + s.scene.durationSec, 0) || 48;
    const scaleFactor = sound.durationSec > 5 ? sound.durationSec / totalNominalSec : 1;

    let inputCounter = 0;

    validScenes.forEach((item, idx) => {
      const dur = Math.max(2.5, Number((item.scene.durationSec * scaleFactor).toFixed(2)));
      const fadeOutStart = Math.max(0.5, Number((dur - 0.32).toFixed(2)));
      const motion = item.scene.cameraMotion || 'parallax_glide';

      // True Multi-Plane 3D Parallax when separate BG & FG layers exist!
      if (item.bgDiskPath && item.fgDiskPath) {
        const bgIdx = inputCounter++;
        ffmpegArgs.push('-loop', '1', '-framerate', '24', '-t', String(dur), '-i', item.bgDiskPath);

        const fgIdx = inputCounter++;
        ffmpegArgs.push('-loop', '1', '-framerate', '24', '-t', String(dur), '-i', item.fgDiskPath);

        let bgFilter = '';
        let fgOverlayExpr = '';

        if (motion === 'pan_right' || motion === 'parallax_glide') {
          // Background glides slowly while foreground characters shift faster in opposite parallax plane
          bgFilter = `scale=1188:2112,crop=1080:1920:'16+11*t':'92+14*sin(t*0.6)'`;
          fgOverlayExpr = `x='-24+8*t':y='6*sin(t*1.15)'`;
        } else if (motion === 'dramatic_push' || motion === 'zoom_in') {
          // Deep 3D camera push-in + gentle breathing on foreground characters
          bgFilter = `scale=1176:2090,crop=1080:1920:'48+18*sin(t*0.55)':'110-13*t'`;
          fgOverlayExpr = `x='12*sin(t*0.75)':y='18-5*t'`;
        } else {
          // Organic 3D floating parallax
          bgFilter = `scale=1158:2058,crop=1080:1920:'39+18*sin(t*0.7)':'68+18*cos(t*0.6)'`;
          fgOverlayExpr = `x='-14*sin(t*0.7)':y='8*sin(t*1.2)'`;
        }

        filterParts.push(
          `[${bgIdx}:v]${bgFilter},eq=brightness='0.02*sin(t*1.5)':saturation=1.06[bg_${idx}]`
        );
        filterParts.push(
          `[bg_${idx}][${fgIdx}:v]overlay=${fgOverlayExpr}:format=auto[comp_${idx}]`
        );

        let lastStageLabel = `comp_${idx}`;

        // Animated Card Slide-Down Entrance if this scene has an Educational Card!
        if (item.cardDiskPath) {
          const cardIdx = inputCounter++;
          ffmpegArgs.push('-loop', '1', '-framerate', '24', '-t', String(dur), '-i', item.cardDiskPath);
          // Card slides smoothly down from y=-360 to y=0 between t=0.40s and t=0.90s
          filterParts.push(
            `[${lastStageLabel}][${cardIdx}:v]overlay=x=0:y='if(lt(t,0.40),-380,if(lt(t,0.92),-380*(0.92-t)/0.52,0))':enable='gte(t,0.38)'[withcard_${idx}]`
          );
          lastStageLabel = `withcard_${idx}`;
        }

        filterParts.push(
          `[${lastStageLabel}]fade=t=in:st=0:d=0.32,fade=t=out:st=${fadeOutStart}:d=0.32,setsar=1,format=yuv420p[v${idx}]`
        );
        concatInputs.push(`[v${idx}]`);
      } else {
        // Fallback single-layer motion
        const singleIdx = inputCounter++;
        ffmpegArgs.push('-loop', '1', '-framerate', '24', '-t', String(dur), '-i', item.imgDiskPath);
        const cropFilter = `scale=1166:2072,crop=1080:1920:'43+24*sin(t*0.65)':'115-14*t'`;
        filterParts.push(
          `[${singleIdx}:v]${cropFilter},fade=t=in:st=0:d=0.30,fade=t=out:st=${fadeOutStart}:d=0.30,setsar=1,format=yuv420p[v${idx}]`
        );
        concatInputs.push(`[v${idx}]`);
      }
    });

    const audioInputIdx = inputCounter;
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
  const cardsCount = visuals.scenes.filter(s => Boolean(s.educationalOverlay && !s.disableEducationalCard)).length;

  return {
    videoFileUrl: `/media/${videoOutName}`,
    resolution: `1080x1920 (Parallaxe 3D Multi-Couches • Lumière Animée • ${cardsCount} Carte(s) Éducative(s))`,
    durationSec: sound.durationSec,
    fps: 24,
    subtitleStyle:
      'Parallaxe 3D Fond/Personnages + Rayons & Particules Dorées Animées + Apparition Glissée des Cartes + Karaoké Doré',
    fileSizeMb,
    readyForTikTok: true
  };
}
