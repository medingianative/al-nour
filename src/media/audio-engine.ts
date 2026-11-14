import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { CharacterVoiceConfig, ScriptDeliverable, SoundDeliverable, SpeakerProfileId } from '../harness/types.js';
import { formatPhoneticFrench } from './phonetic-dictionary.js';

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'media');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PIPER_DIR = path.resolve(process.cwd(), 'models', 'piper');
const PIPER_BIN = path.join(PIPER_DIR, 'piper', 'piper');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export const CHARACTER_VOICE_PROFILES: Record<SpeakerProfileId, CharacterVoiceConfig> = {
  narrator: {
    speakerId: 'narrator',
    displayName: 'Narrateur (Al Nour)',
    role: 'Voix signature calme & posée (Gemini Charon / Tom ONNX)',
    gender: 'male',
    toneDescription: 'Voix masculine sereine, articulée et bienveillante pour ouvrir et clore l’épisode',
    geminiVoice: 'Charon',
    piperModel: 'fr_FR-tom-medium.onnx',
    piperLengthScale: 1.04,
    pitchShift: 0.99,
    tempoMultiplier: 1.0,
    sampleQuote: 'Bismillah. Dans notre bâtiment HLM, chaque fenêtre éclairée raconte une histoire, une foi, une vie.',
    elevenLabsVoiceId: 'Adam'
  },
  tariq: {
    speakerId: 'tariq',
    displayName: 'Tariq (Père • Ingénieur)',
    role: 'Voix adulte masculine chaleureuse (Gemini Fenrir / Pierre ONNX)',
    gender: 'male',
    toneDescription: 'Voix posée, chaleureuse, naturelle d’un père qui écoute et transmet avec douceur',
    geminiVoice: 'Fenrir',
    piperModel: 'fr_FR-upmc-medium.onnx',
    piperSpeakerId: 1,
    piperLengthScale: 1.0,
    pitchShift: 1.0,
    tempoMultiplier: 1.0,
    sampleQuote: 'Assalamou Alaykoum. Comme un pont que l’on construit, le Sabr forge notre cœur dans le silence.',
    elevenLabsVoiceId: 'Antoni'
  },
  amina: {
    speakerId: 'amina',
    displayName: 'Amina (Mère • Infirmière)',
    role: 'Voix féminine douce & lumineuse (Gemini Kore / Jessica ONNX)',
    gender: 'female',
    toneDescription: 'Voix féminine empathique, lumineuse et pleine de Rahma',
    geminiVoice: 'Kore',
    piperModel: 'fr_FR-upmc-medium.onnx',
    piperSpeakerId: 0,
    piperLengthScale: 1.0,
    pitchShift: 1.0,
    tempoMultiplier: 1.0,
    sampleQuote: 'Alhamdulillah pour cette journée. En rentrant de garde, le plus beau cadeau reste le sourire d’un voisin.',
    elevenLabsVoiceId: 'Rachel'
  },
  ibrahim: {
    speakerId: 'ibrahim',
    displayName: 'Ibrahim (Grand-père • Ex-Avocat)',
    role: 'Voix masculine sage, mûre & noble (Gemini Charon / Tom ONNX)',
    gender: 'male',
    toneDescription: 'Voix masculine mûre, profonde et apaisante qui porte le poids de la sagesse et du droit',
    geminiVoice: 'Charon',
    piperModel: 'fr_FR-tom-medium.onnx',
    piperLengthScale: 1.1,
    pitchShift: 0.94,
    tempoMultiplier: 0.98,
    sampleQuote: 'Assalamou Alaykoum mon petit-fils, la vraie justice commence toujours par écouter avec le cœur avant de juger.',
    elevenLabsVoiceId: 'Arnold'
  },
  khadija: {
    speakerId: 'khadija',
    displayName: 'Khadija (Grand-mère)',
    role: 'Voix féminine mature & enveloppante (Gemini Aoede / Siwis ONNX)',
    gender: 'female',
    toneDescription: 'Voix féminine douce et mature qui enveloppe d’amour et d’invocations sincères',
    geminiVoice: 'Aoede',
    piperModel: 'fr_FR-siwis-medium.onnx',
    piperLengthScale: 1.08,
    pitchShift: 0.96,
    tempoMultiplier: 0.98,
    sampleQuote: 'Qu’Allah bénisse ce foyer. Une parole douce dans ce couloir vaut bien plus que de grands discours.',
    elevenLabsVoiceId: 'Bella'
  },
  adam: {
    speakerId: 'adam',
    displayName: 'Adam (Fils • 10 ans)',
    role: 'Voix de jeune garçon spontané & curieux (Gemini Puck)',
    gender: 'male',
    toneDescription: 'Voix jeune, vive et sincère d’un garçon de 10 ans qui pose des questions du fond du cœur',
    geminiVoice: 'Puck',
    piperModel: 'fr_FR-upmc-medium.onnx',
    piperSpeakerId: 1,
    piperLengthScale: 0.96,
    pitchShift: 1.16,
    tempoMultiplier: 1.02,
    sampleQuote: 'Papa, pourquoi Dieu permet que des choses difficiles nous arrivent même quand on essaie de bien faire ?',
    elevenLabsVoiceId: 'Josh'
  },
  lina: {
    speakerId: 'lina',
    displayName: 'Lina (Petite Fille • 6 ans)',
    role: 'Voix de petite fille tendre & émerveillée (Gemini Aoede Enfant)',
    gender: 'female',
    toneDescription: 'Voix douce, joyeuse et enfantine qui rappelle la simplicité du cœur',
    geminiVoice: 'Aoede',
    piperModel: 'fr_FR-upmc-medium.onnx',
    piperSpeakerId: 0,
    piperLengthScale: 0.96,
    pitchShift: 1.18,
    tempoMultiplier: 1.02,
    sampleQuote: 'Maman, regarde ! Monsieur Martin avait l’air triste, est-ce qu’on peut lui donner nos petits gâteaux ?',
    elevenLabsVoiceId: 'Domi'
  },
  martin: {
    speakerId: 'martin',
    displayName: 'M. Martin (Voisin d’immeuble)',
    role: 'Voix masculine de voisin chaleureux (Gemini Fenrir)',
    gender: 'male',
    toneDescription: 'Voix d’homme mûr du quartier, chaleureuse et sincère, touchée par la délicatesse de ses voisins',
    geminiVoice: 'Fenrir',
    piperModel: 'fr_FR-upmc-medium.onnx',
    piperSpeakerId: 1,
    piperLengthScale: 1.04,
    pitchShift: 0.95,
    tempoMultiplier: 0.99,
    sampleQuote: 'Bonjour Amina, bonjour Tariq ! Merci pour votre gentillesse, ça fait chaud au cœur dans notre immeuble.',
    elevenLabsVoiceId: 'Clyde'
  }
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function synthesizeWithGeminiTTS(
  text: string,
  voiceName: string,
  outWavPath: string,
  retryCount = 0
): Promise<boolean> {
  if (!GEMINI_API_KEY) return false;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName
          }
        }
      }
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 429 && retryCount < 2) {
      // Rate limit backoff: wait 3 seconds and retry once
      await sleep(3000);
      return synthesizeWithGeminiTTS(text, voiceName, outWavPath, retryCount + 1);
    }

    if (!res.ok) {
      return false;
    }

    const data = (await res.json()) as any;
    const base64Data = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Data) return false;

    fs.writeFileSync(outWavPath, Buffer.from(base64Data, 'base64'));
    return true;
  } catch {
    return false;
  }
}

function runPiperProcess(text: string, profile: CharacterVoiceConfig, outputWavPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const modelPath = path.join(PIPER_DIR, profile.piperModel);
    if (!fs.existsSync(PIPER_BIN) || !fs.existsSync(modelPath)) {
      reject(new Error(`Modèle vocal neuronal Piper introuvable dans ${PIPER_DIR}`));
      return;
    }

    const args = [
      '--model',
      modelPath,
      '--output_file',
      outputWavPath,
      '--length_scale',
      String(profile.piperLengthScale || 1.0),
      '--sentence_silence',
      '0.28'
    ];

    if (typeof profile.piperSpeakerId === 'number') {
      args.push('--speaker', String(profile.piperSpeakerId));
    }

    const child = spawn(PIPER_BIN, args, {
      stdio: ['pipe', 'ignore', 'pipe']
    });

    let stderrData = '';
    child.stderr.on('data', chunk => {
      stderrData += chunk.toString();
    });

    child.on('error', err => reject(err));
    child.on('close', code => {
      if (code === 0 && fs.existsSync(outputWavPath)) {
        resolve();
      } else {
        reject(new Error(`Piper TTS exited with code ${code}: ${stderrData}`));
      }
    });

    const normalizedText = text.replace(/\bM\.\s+/g, 'Monsieur ').trim();
    child.stdin.write(normalizedText + '\n');
    child.stdin.end();
  });
}

async function synthesizeCharacterSpeechToMp3(
  rawText: string,
  profile: CharacterVoiceConfig,
  outMp3Path: string
): Promise<{ applied: Array<{ original: string; phonetic: string }>; engine: string }> {
  const { phoneticText, applied } = formatPhoneticFrench(rawText);
  const tempWavPath = path.join(OUTPUT_DIR, `speech_raw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.wav`);

  let engineUsed = 'Piper-TTS ONNX Local';
  let geminiSuccess = false;

  if (profile.geminiVoice && GEMINI_API_KEY) {
    geminiSuccess = await synthesizeWithGeminiTTS(phoneticText, profile.geminiVoice, tempWavPath);
    if (geminiSuccess) {
      engineUsed = `Gemini 3.8 Flash TTS (${profile.geminiVoice})`;
    }
  }

  if (!geminiSuccess) {
    await runPiperProcess(phoneticText, profile, tempWavPath);
  }

  const needsRubberband =
    !geminiSuccess &&
    (Math.abs(profile.pitchShift - 1.0) > 0.015 || Math.abs(profile.tempoMultiplier - 1.0) > 0.015);

  const audioFilter = needsRubberband
    ? `rubberband=pitch=${profile.pitchShift}:tempo=${profile.tempoMultiplier},highpass=f=65,loudnorm=I=-16:TP=-1.5:LRA=11`
    : `highpass=f=65,loudnorm=I=-16:TP=-1.5:LRA=11`;

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    tempWavPath,
    '-af',
    audioFilter,
    '-ar',
    '44100',
    '-ac',
    '2',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '2',
    outMp3Path
  ]);

  try {
    fs.unlinkSync(tempWavPath);
  } catch {}

  return { applied, engine: engineUsed };
}

export async function synthesizeSampleVoice(speakerId: SpeakerProfileId, customText?: string): Promise<string> {
  const profile = CHARACTER_VOICE_PROFILES[speakerId] || CHARACTER_VOICE_PROFILES.narrator;
  const sampleText = customText || profile.sampleQuote;
  const filename = `sample_${speakerId}_${Date.now()}.mp3`;
  const outPath = path.join(OUTPUT_DIR, filename);

  await synthesizeCharacterSpeechToMp3(sampleText, profile, outPath);
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
  const enginesUsedSet = new Set<string>();

  for (const scene of script.scenes) {
    const speakerId = scene.speakerId || 'narrator';
    const profile = CHARACTER_VOICE_PROFILES[speakerId] || CHARACTER_VOICE_PROFILES.narrator;

    const shapedPath = path.join(OUTPUT_DIR, `${episodeId}_scene_${scene.sceneNumber}_shaped.mp3`);
    const { applied, engine } = await synthesizeCharacterSpeechToMp3(scene.spokenText, profile, shapedPath);
    applied.forEach(a => appliedPhoneticsList.push(a));
    enginesUsedSet.add(engine);

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

    // Build word timestamps synchronized to actual neural speech duration
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
    `anoisesrc=d=${Math.ceil(totalDurationSec) + 1}:c=pink:r=44100:a=0.015`,
    '-filter_complex',
    `[1:a]${filterByAmbient[ambientTrack]}[amb];[0:a][amb]amix=inputs=2:duration=first:dropout_transition=2`,
    '-ar',
    '44100',
    '-ac',
    '2',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '2',
    outMp3Path
  ]);

  // Clean temp files
  try {
    fs.unlinkSync(fullDialoguePath);
  } catch {}
  try {
    fs.unlinkSync(concatPath);
  } catch {}
  for (const f of sceneAudioFiles) {
    try {
      fs.unlinkSync(f.path);
    } catch {}
  }

  const engineSummary = Array.from(enginesUsedSet).join(', ');

  return {
    voiceEngineUsed: `Moteur Vocal Al Nour (${engineSummary})`,
    voiceId: 'Casting Humain : Ibrahim (Charon), Tariq (Fenrir), Amina (Kore), Adam (Puck), Khadija (Aoede)',
    ambientTrack,
    phoneticAdjustmentsApplied: appliedPhoneticsList,
    audioFileUrl: `/media/${outMp3Name}`,
    durationSec: totalDurationSec,
    wordTimestamps
  };
}
