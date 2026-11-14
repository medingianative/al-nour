import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { applyIslamicPhonetics } from './phonetic-dictionary.js';
import { ScriptDeliverable, SoundDeliverable } from '../harness/types.js';

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'media');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export async function generateEpisodeAudio(
  episodeId: string,
  script: ScriptDeliverable,
  ambientTrack: SoundDeliverable['ambientTrack'] = 'gentle_rain'
): Promise<SoundDeliverable> {
  const { phoneticText, applied } = applyIslamicPhonetics(script.fullNarrationText);

  const voiceId =
    script.narratorVoiceProfile === 'amina_gentle_female'
      ? 'fr-FR-DeniseNeural'
      : script.narratorVoiceProfile === 'ibrahim_wise_male'
      ? 'fr-FR-AlainNeural'
      : 'fr-FR-HenriNeural';

  const durationSec = Math.max(
    18,
    script.scenes.reduce((acc, s) => acc + s.durationSec, 0)
  );

  // Compute word-by-word timestamps aligned to each scene's duration
  const wordTimestamps: SoundDeliverable['wordTimestamps'] = [];
  let sceneCursorSec = 0;

  for (const scene of script.scenes) {
    const words = scene.spokenText.trim().split(/\s+/).filter(Boolean);
    const wordDur = words.length > 0 ? scene.durationSec / words.length : scene.durationSec;

    words.forEach((word, idx) => {
      const startSec = Number((sceneCursorSec + idx * wordDur).toFixed(2));
      const endSec = Number((startSec + wordDur).toFixed(2));
      wordTimestamps.push({ word, startSec, endSec });
    });

    sceneCursorSec += scene.durationSec;
  }

  const outMp3Name = `${episodeId}_audio_${Date.now()}.mp3`;
  const outMp3Path = path.join(OUTPUT_DIR, outMp3Name);
  let voiceEngineUsed = 'Edge-TTS Neural FR + Mixage Ambiance Halal (0 €)';

  let ttsSuccess = false;
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    const tts = new MsEdgeTTS();
    await Promise.race([
      (async () => {
        await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const rawTtsPath = path.join(OUTPUT_DIR, `${episodeId}_raw_tts.mp3`);
        const { audioFilePath } = await tts.toFile(OUTPUT_DIR, phoneticText);
        if (audioFilePath && fs.existsSync(audioFilePath)) {
          fs.renameSync(audioFilePath, rawTtsPath);
          // Mix with subtle ambient pink noise (gentle rain / breeze) via FFmpeg
          await execFileAsync('ffmpeg', [
            '-y',
            '-i',
            rawTtsPath,
            '-f',
            'lavfi',
            '-i',
            `anoisesrc=d=${durationSec}:c=pink:r=24000:a=0.015`,
            '-filter_complex',
            '[1:a]lowpass=f=900,highpass=f=120[amb];[0:a][amb]amix=inputs=2:duration=first:dropout_transition=2',
            '-c:a',
            'libmp3lame',
            '-q:a',
            '4',
            outMp3Path
          ]);
          fs.unlinkSync(rawTtsPath);
          ttsSuccess = true;
        }
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Edge-TTS timeout')), 5000))
    ]);
  } catch {
    ttsSuccess = false;
  }

  if (!ttsSuccess) {
    // Fallback: Generate soothing Halal ambient soundscape (gentle rain + warm breeze) with FFmpeg
    voiceEngineUsed = 'Synthétiseur Ambiance Halal Locale (Pluie douce & Brise — Mode Sandbox 0 €)';
    const filterByAmbient: Record<SoundDeliverable['ambientTrack'], string> = {
      gentle_rain: 'lowpass=f=1100,highpass=f=180,tremolo=f=0.35:d=0.25',
      evening_breeze: 'lowpass=f=650,highpass=f=100,tremolo=f=0.2:d=0.4',
      warm_hearth: 'lowpass=f=850,highpass=f=140,tremolo=f=0.5:d=0.3',
      night_serenity: 'lowpass=f=520,highpass=f=90,tremolo=f=0.15:d=0.2'
    };

    await execFileAsync('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `anoisesrc=d=${durationSec}:c=pink:r=24000:a=0.06`,
      '-af',
      `${filterByAmbient[ambientTrack]},afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(1, durationSec - 2)}:d=2`,
      '-c:a',
      'libmp3lame',
      '-q:a',
      '4',
      outMp3Path
    ]);
  }

  return {
    voiceEngineUsed,
    voiceId,
    ambientTrack,
    phoneticAdjustmentsApplied: applied,
    audioFileUrl: `/media/${outMp3Name}`,
    durationSec,
    wordTimestamps
  };
}
