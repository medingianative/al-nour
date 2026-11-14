import { z } from 'zod';

export type AgentId =
  | 'director'
  | 'researcher'
  | 'scriptwriter'
  | 'illustrator'
  | 'sound_engineer'
  | 'video_editor';

export type ValidationGateId =
  | '1_idea'
  | '2_research'
  | '3_script'
  | '4a_prompts'
  | '4b_visuals'
  | '5_audio'
  | '6_video'
  | 'completed';

export const SelfCritiqueSchema = z.object({
  score: z.number().min(1).max(10),
  strengths: z.array(z.string()).min(1),
  risksOrDoubts: z.array(z.string()).min(1),
  suggestedAlternative: z.string()
});

export type SelfCritique = z.infer<typeof SelfCritiqueSchema>;

export const IdeaDeliverableSchema = z.object({
  title: z.string(),
  pillar: z.enum(['prophetic_story', 'daily_behavior_hlm', 'quran_hadith_wisdom']),
  hookConcept: z.string(),
  featuredResidents: z.array(z.string()).min(1),
  primaryLocations: z.array(z.string()).min(1),
  narrativeArcSummary: z.string(),
  emotionalTakeaway: z.string()
});

export type IdeaDeliverable = z.infer<typeof IdeaDeliverableSchema>;

export const ResearchDeliverableSchema = z.object({
  primarySourceType: z.enum(['Coran', 'Hadith Authentique', 'Récit Prophétique / Sira', 'Sagesse & Adab Islamique']),
  referenceCitation: z.string(),
  arabicKeyTerm: z.string(),
  frenchMeaning: z.string(),
  historicalOrDailyContext: z.string(),
  ethicalChecklist: z.object({
    noProphetDepiction: z.boolean(),
    noCulturalCliche: z.boolean(),
    authenticSourceVerified: z.boolean(),
    gentleAndSincereTone: z.boolean()
  })
});

export type ResearchDeliverable = z.infer<typeof ResearchDeliverableSchema>;

export const SpeakerProfileIdSchema = z.enum([
  'narrator',
  'tariq',
  'amina',
  'adam',
  'lina',
  'ibrahim',
  'khadija',
  'martin'
]);

export type SpeakerProfileId = z.infer<typeof SpeakerProfileIdSchema>;

export const ScriptSceneSegmentSchema = z.object({
  sceneNumber: z.number(),
  durationSec: z.number(),
  speakerId: SpeakerProfileIdSchema.default('narrator'),
  speakerDisplayName: z.string(),
  spokenText: z.string(),
  visualActionBrief: z.string(),
  locationId: z.string(),
  residentIds: z.array(z.string())
});

export type ScriptSceneSegment = z.infer<typeof ScriptSceneSegmentSchema>;

export const ScriptDeliverableSchema = z.object({
  hookFirst3Seconds: z.string(),
  narratorVoiceProfile: z.enum(['tariq_warm_male', 'amina_gentle_female', 'ibrahim_wise_male']),
  totalEstimatedDurationSec: z.number(),
  totalWordCount: z.number(),
  fullNarrationText: z.string(),
  closingInvocationOrMoral: z.string(),
  tiktokCaptionAndHashtags: z.string(),
  scenes: z.array(ScriptSceneSegmentSchema).min(6).max(10)
});

export type ScriptDeliverable = z.infer<typeof ScriptDeliverableSchema>;

export const SceneVisualSpecSchema = z.object({
  sceneNumber: z.number(),
  durationSec: z.number(),
  speakerId: SpeakerProfileIdSchema.default('narrator'),
  speakerDisplayName: z.string(),
  locationId: z.enum(['hlm_ext', 'hlm_hall', 'kitchen', 'living', 'bedroom', 'hallway', 'desert', 'oasis']),
  residentIds: z.array(z.string()).max(3),
  pose: z.enum(['dialogue', 'heart', 'dua', 'reading']),
  cameraMotion: z.enum(['zoom_in', 'pan_right', 'static_breathe']),
  renderEngine: z.enum(['code_2d', 'flux_free']),
  fluxPrompt: z.string(),
  subtitleText: z.string(),
  imageUrl: z.string().optional()
});

export type SceneVisualSpec = z.infer<typeof SceneVisualSpecSchema>;

export const IllustratorPromptsDeliverableSchema = z.object({
  visualStyleSummary: z.string(),
  characterConsistencyNotes: z.string(),
  scenes: z.array(SceneVisualSpecSchema)
});

export type IllustratorPromptsDeliverable = z.infer<typeof IllustratorPromptsDeliverableSchema>;

export const AudioWordTimestampSchema = z.object({
  word: z.string(),
  startSec: z.number(),
  endSec: z.number()
});

export const SoundDeliverableSchema = z.object({
  voiceEngineUsed: z.string(),
  voiceId: z.string(),
  ambientTrack: z.enum(['gentle_rain', 'evening_breeze', 'warm_hearth', 'night_serenity']),
  phoneticAdjustmentsApplied: z.array(z.object({ original: z.string(), phonetic: z.string() })),
  audioFileUrl: z.string(),
  durationSec: z.number(),
  wordTimestamps: z.array(AudioWordTimestampSchema)
});

export type SoundDeliverable = z.infer<typeof SoundDeliverableSchema>;

export const VideoDeliverableSchema = z.object({
  videoFileUrl: z.string(),
  resolution: z.string(),
  durationSec: z.number(),
  fps: z.number(),
  subtitleStyle: z.string(),
  fileSizeMb: z.number(),
  readyForTikTok: z.boolean()
});

export type VideoDeliverable = z.infer<typeof VideoDeliverableSchema>;

export interface StepSubmission<T> {
  agentId: AgentId;
  gateId: ValidationGateId;
  createdAt: string;
  modelUsed: string;
  tokensUsed: { input: number; output: number; costUsd: number };
  deliverable: T;
  selfCritique: SelfCritique;
  userFeedbackHistory: string[];
  approved: boolean;
}

export interface Episode {
  id: string;
  topicPrompt: string;
  createdAt: string;
  updatedAt: string;
  currentGate: ValidationGateId;
  activeAgent: AgentId | null;
  status: 'agent_working' | 'awaiting_user_validation' | 'completed' | 'error';
  steps: {
    idea?: StepSubmission<IdeaDeliverable>;
    research?: StepSubmission<ResearchDeliverable>;
    script?: StepSubmission<ScriptDeliverable>;
    prompts?: StepSubmission<IllustratorPromptsDeliverable>;
    visuals?: StepSubmission<IllustratorPromptsDeliverable>;
    audio?: StepSubmission<SoundDeliverable>;
    video?: StepSubmission<VideoDeliverable>;
  };
}

export interface AgentModelConfig {
  agentId: AgentId;
  agentName: string;
  roleTitle: string;
  provider: 'free_autonomous' | 'openrouter_free' | 'groq_free' | 'custom_openai';
  modelId: string;
  temperature: number;
  maxContextTokens: number;
  rationale: string;
}

export interface CharacterVoiceConfig {
  speakerId: SpeakerProfileId;
  displayName: string;
  role: string;
  gender: 'male' | 'female';
  toneDescription: string;
  piperModel: 'fr_FR-tom-medium.onnx' | 'fr_FR-upmc-medium.onnx' | 'fr_FR-siwis-medium.onnx';
  piperSpeakerId?: number;
  piperLengthScale: number;
  pitchShift: number;
  tempoMultiplier: number;
  sampleQuote: string;
  elevenLabsVoiceId?: string;
}

