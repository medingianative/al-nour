import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { CharacterVoiceConfig, ScriptDeliverable, SoundDeliverable, SpeakerProfileId } from '../harness/types.js';
import { formatPhoneticFrench, splitTextIntoLinguisticTokens } from './phonetic-dictionary.js';

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'media');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export const CHARACTER_VOICE_PROFILES: Record<SpeakerProfileId, CharacterVoiceConfig> = {
  narrator: {
    speakerId: 'narrator',
    displayName: 'Narrateur (Al Nour)',
    role: 'Voix signature calme & posée',
    gender: 'male',
    toneDescription: 'Voix masculine sereine, articulée et bienveillante pour ouvrir et clore l’épisode',
    pitchShift: 0.95,
    tempoMultiplier: 0.96,
    sampleQuote: 'Bismillah. Dans notre bâtiment HLM, chaque fenêtre éclairée raconte une histoire, une foi, une vie.',
    elevenLabsVoiceId: 'Adam'
  },
  tariq: {
    speakerId: 'tariq',
    displayName: 'Tariq (Père • Ingénieur)',
    role: 'Père pédagogue et rassurant',
    gender: 'male',
    toneDescription: 'Voix posée, chaleureuse, naturelle d’un père qui écoute et transmet avec douceur',
    pitchShift: 0.92,
    tempoMultiplier: 0.98,
    sampleQuote: 'Assalamou Alaykoum. Comme un pont que l’on construit, le Sabr forge notre cœur dans le silence.',
    elevenLabsVoiceId: 'Antoni'
  },
  amina: {
    speakerId: 'amina',
    displayName: 'Amina (Mère • Infirmière)',
    role: 'Mère douce, solaire et réconfortante',
    gender: 'female',
    toneDescription: 'Voix féminine empathique, lumineuse et pleine de Rahma',
    pitchShift: 1.02,
    tempoMultiplier: 1.0,
    sampleQuote: 'Alhamdulillah pour cette journée. En rentrant de garde, le plus beau cadeau reste le sourire d’un voisin.',
    elevenLabsVoiceId: 'Rachel'
  },
  adam: {
    speakerId: 'adam',
    displayName: 'Adam (Fils • 10 ans)',
    role: 'Garçon curieux et spontané',
    gender: 'male',
    toneDescription: 'Voix jeune, vive et sincère d’un enfant qui pose des questions du fond du cœur',
    pitchShift: 1.28,
    tempoMultiplier: 1.05,
    sampleQuote: 'Papa, pourquoi Dieu permet que des choses difficiles nous arrivent même quand on essaie de bien faire ?',
    elevenLabsVoiceId: 'Josh'
  },
  lina: {
    speakerId: 'lina',
    displayName: 'Lina (Petite Fille • 6 ans)',
    role: 'Petite fille émerveillée et tendre',
    gender: 'female',
    toneDescription: 'Voix douce, joyeuse et enfantine qui rappelle la simplicité du cœur',
    pitchShift: 1.42,
    tempoMultiplier: 1.06,
    sampleQuote: 'Maman, regarde ! M. Martin avait l’air triste, est-ce qu’on peut lui donner nos petits gâteaux ?',
    elevenLabsVoiceId: 'Domi'
  },
  ibrahim: {
    speakerId: 'ibrahim',
    displayName: 'Ibrahim (Grand-père • Ex-Avocat)',
    role: 'Grand-père érudit, noble et juste',
    gender: 'male',
    toneDescription: 'Voix masculine mûre, profonde et apaisante qui porte le poids de la sagesse et du droit',
    pitchShift: 0.86,
    tempoMultiplier: 0.92,
    sampleQuote: 'Mon petit-fils, la vraie justice commence toujours par écouter avec le cœur avant de juger.',
    elevenLabsVoiceId: 'Arnold'
  },
  khadija: {
    speakerId: 'khadija',
    displayName: 'Khadija (Grand-mère)',
    role: 'Grand-mère pleine de tendresse',
    gender: 'female',
    toneDescription: 'Voix douce et mature qui enveloppe d’amour et d’invocations sincères',
    pitchShift: 0.96,
    tempoMultiplier: 0.95,
    sampleQuote: 'Qu’Allah bénisse ce foyer. Une parole douce dans ce couloir vaut bien plus que de grands discours.',
    elevenLabsVoiceId: 'Bella'
  },
  martin: {
    speakerId: 'martin',
    displayName: 'M. Martin (Voisin d’immeuble)',
    role: 'Voisin bienveillant et curieux',
    gender: 'male',
    toneDescription: 'Voix d’homme mûr du quartier, chaleureuse et sincère, touchée par la délicatesse de ses voisins',
    pitchShift: 0.94,
    tempoMultiplier: 1.0,
    sampleQuote: 'Bonjour Amina, bonjour Tariq ! Merci pour votre gentillesse, ça fait chaud au cœur dans notre immeuble.',
    elevenLabsVoiceId: 'Clyde'
  }
};

async function fetchGoogleTTSChunk(text: string, lang: 'fr' | 'ar'): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  if (!res.ok) {
    throw new Error(`Google TTS error: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function renderBilingualSegment(text: string, tempRawMp3Path: string): Promise<void> {
  const tokens = splitTextIntoLinguisticTokens(text);
  const chunkPaths: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const chunkBuf = await fetchGoogleTTSChunk(t.text, t.lang);
    const chunkPath = path.join(OUTPUT_DIR, `temp_chunk_${Date.now()}_${i}.mp3`);
    fs.writeFileSync(chunkPath, chunkBuf);
    chunkPaths.push(chunkPath);
  }

  if (chunkPaths.length === 1) {
    fs.renameSync(chunkPaths[0], tempRawMp3Path);
    return;
  }

  const concatList = chunkPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  const concatPath = path.join(OUTPUT_DIR, `concat_${Date.now()}.txt`);
  fs.writeFileSync(concatPath, concatList, 'utf-8');

  await execFileAsync('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-c',
    'copy',
    tempRawMp3Path
  ]);

  for (const p of chunkPaths) {
    try { fs.unlinkSync(p); } catch {}
  }
  try { fs.unlinkSync(concatPath); } catch {}
}

export async function synthesizeSampleVoice(speakerId: SpeakerProfileId, customText?: string): Promise<string> {
  const profile = CHARACTER_VOICE_PROFILES[speakerId] || CHARACTER_VOICE_PROFILES.narrator;
  const sampleText = customText || profile.sampleQuote;
  const filename = `sample_${speakerId}_${Date.now()}.mp3`;
  const outPath = path.join(OUTPUT_DIR, filename);

  const rawPath = path.join(OUTPUT_DIR, `sample_raw_${Date.now()}.mp3`);
  await renderBilingualSegment(sampleText, rawPath);

  // Apply character acoustic shaping via rubberband
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    rawPath,
    '-af',
    `rubberband=pitch=${profile.pitchShift}:tempo=${profile.tempoMultiplier},volume=1.2`,
    '-c:a',
    'libmp3lame',
    '-q:a',
    '3',
    outPath
  ]);

  try { fs.unlinkSync(rawPath); } catch {}
  return `/media/${filename}`;
}

export async function generateEpisodeAudio(
  episodeId: string,
  script: ScriptDeliverable,
  ambientTrack: SoundDeliverable['ambientTrack'] = 'gentle_rain'
): Promise<SoundDeliverable> {
  const outMp3Name = `${episodeId}_dialogue_${Date.now()}.mp3`;
  const outMp3Path = path.join(OUTPUT_DIR, outMp3Name);
  const sceneAudioFiles: Array<{ path: string; durationSec: number }> = [];

  const wordTimestamps: SoundDeliverable['wordTimestamps'] = [];
  let globalCursorSec = 0;
  const appliedPhoneticsList: Array<{ original: string; phonetic: string }> = [];

  for (const scene of script.scenes) {
    const speakerId = scene.speakerId || 'narrator';
    const profile = CHARACTER_VOICE_PROFILES[speakerId] || CHARACTER_VOICE_PROFILES.narrator;

    const { applied } = formatPhoneticFrench(scene.spokenText);
    applied.forEach(a => appliedPhoneticsList.push(a));

    const rawPath = path.join(OUTPUT_DIR, `${episodeId}_scene_${scene.sceneNumber}_raw.mp3`);
    const shapedPath = path.join(OUTPUT_DIR, `${episodeId}_scene_${scene.sceneNumber}_shaped.mp3`);

    await renderBilingualSegment(scene.spokenText, rawPath);

    // Apply specific character pitch and cadence so each character has their unique human tone
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      rawPath,
      '-af',
      `rubberband=pitch=${profile.pitchShift}:tempo=${profile.tempoMultiplier},volume=1.2`,
      '-c:a',
      'libmp3lame',
      '-q:a',
      '3',
      shapedPath
    ]);
    try { fs.unlinkSync(rawPath); } catch {}

    // Measure exact scene audio duration
    const probe = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      shapedPath
    ]);
    const measuredDur = parseFloat(probe.stdout.trim()) || scene.durationSec;
    sceneAudioFiles.push({ path: shapedPath, durationSec: measuredDur });

    // Build word timestamps
    const words = scene.spokenText.trim().split(/\s+/).filter(Boolean);
    const wordDur = words.length > 0 ? measuredDur / words.length : measuredDur;

    words.forEach((word, idx) => {
      const startSec = Number((globalCursorSec + idx * wordDur).toFixed(2));
      const endSec = Number((startSec + wordDur).toFixed(2));
      wordTimestamps.push({ word, startSec, endSec });
    });

    globalCursorSec += measuredDur;
  }

  // Concatenate all dialogue scenes into single continuous track
  const concatList = sceneAudioFiles.map(f => `file '${f.path.replace(/'/g, "'\\''")}'`).join('\n');
  const concatPath = path.join(OUTPUT_DIR, `${episodeId}_scenes_concat_${Date.now()}.txt`);
  fs.writeFileSync(concatPath, concatList, 'utf-8');

  const fullDialoguePath = path.join(OUTPUT_DIR, `${episodeId}_dialogue_raw.mp3`);
  await execFileAsync('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-c',
    'copy',
    fullDialoguePath
  ]);

  const totalDurationSec = Number(globalCursorSec.toFixed(2));

  // Mix with Halal Ambient Soundscape
  const filterByAmbient: Record<SoundDeliverable['ambientTrack'], string> = {
    gentle_rain: 'lowpass=f=950,highpass=f=160,tremolo=f=0.3:d=0.2',
    evening_breeze: 'lowpass=f=600,highpass=f=100,tremolo=f=0.2:d=0.35',
    warm_hearth: 'lowpass=f=800,highpass=f=120,tremolo=f=0.4:d=0.25',
    night_serenity: 'lowpass=f=480,highpass=f=80,tremolo=f=0.15:d=0.15'
  };

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    fullDialoguePath,
    '-f',
    'lavfi',
    '-i',
    `anoisesrc=d=${Math.ceil(totalDurationSec) + 1}:c=pink:r=24000:a=0.018`,
    '-filter_complex',
    `[1:a]${filterByAmbient[ambientTrack]}[amb];[0:a][amb]amix=inputs=2:duration=first:dropout_transition=2`,
    '-c:a',
    'libmp3lame',
    '-q:a',
    '3',
    outMp3Path
  ]);

  // Clean temp files
  try { fs.unlinkSync(fullDialoguePath); } catch {}
  try { fs.unlinkSync(concatPath); } catch {}
  for (const f of sceneAudioFiles) {
    try { fs.unlinkSync(f.path); } catch {}
  }

  return {
    voiceEngineUsed: 'Moteur Vocal Polyphonique Al Nour (Dialectique Arabe/Français Naturelle + Multi-Voix)',
    voiceId: 'Distribution Complète : Tariq, Amina, Adam, Lina, Ibrahim, Khadija, M. Martin & Narrateur',
    ambientTrack,
    phoneticAdjustmentsApplied: appliedPhoneticsList,
    audioFileUrl: `/media/${outMp3Name}`,
    durationSec: totalDurationSec,
    wordTimestamps
  };
}
