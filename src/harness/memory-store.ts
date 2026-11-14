import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
  AgentId,
  AgentModelConfig,
  Episode
} from './types.js';
import {
  DEFAULT_LOCATIONS,
  DEFAULT_RESIDENTS,
  LocationProfile,
  ResidentProfile
} from '../bible/series-bible.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'al-nour.sqlite');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    topic_prompt TEXT NOT NULL,
    current_gate TEXT NOT NULL,
    active_agent TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS learned_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    rule_text TEXT NOT NULL,
    source_feedback TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS residents (
    id TEXT PRIMARY KEY,
    profile_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_models (
    agent_id TEXT PRIMARY KEY,
    config_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS voice_cache (
    cache_key TEXT PRIMARY KEY,
    speaker_id TEXT NOT NULL,
    engine TEXT NOT NULL,
    spoken_text TEXT NOT NULL,
    file_path TEXT NOT NULL,
    duration_sec REAL NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export const DEFAULT_AGENT_MODELS: AgentModelConfig[] = [
  {
    agentId: 'director',
    agentName: 'Youssef (Directeur Studio)',
    roleTitle: 'Orchestrateur & Cadrage Narratif',
    provider: 'gemini_free',
    modelId: 'gemini-3.5-flash',
    temperature: 0.45,
    maxContextTokens: 2400,
    rationale: 'Gemini 3.5 Flash : compréhension fine de tes consignes, cadrage émotionnel sur mesure et sélection pertinente des habitants du HLM.'
  },
  {
    agentId: 'researcher',
    agentName: 'Salma (Chercheuse & Éthique)',
    roleTitle: 'Vérification des Sources & Charte Éthique',
    provider: 'gemini_free',
    modelId: 'gemini-3.5-flash',
    temperature: 0.2,
    maxContextTokens: 2400,
    rationale: 'Température basse (0.2) sur Gemini 3.5 Flash pour garantir l’exactitude des versets/hadiths, la vocalisation arabe et le respect strict de la charte.'
  },
  {
    agentId: 'scriptwriter',
    agentName: 'Karim (Scénariste TikTok)',
    roleTitle: 'Storytelling 40–60s & Hooks',
    provider: 'gemini_free',
    modelId: 'gemini-3.5-flash',
    temperature: 0.55,
    maxContextTokens: 2800,
    rationale: 'Gemini 3.5 Flash : réécriture chirurgicale du script selon tes consignes, dialogues naturels et hooks TikTok captivants.'
  },
  {
    agentId: 'illustrator',
    agentName: 'Leïla (Directrice Artistique 2D/3D)',
    roleTitle: 'Mise en Scène Cinéma 3D & Sélection Autonome des Cartes',
    provider: 'gemini_free',
    modelId: 'gemini-3.5-flash',
    temperature: 0.3,
    maxContextTokens: 2600,
    rationale: 'Gemini 3.5 Flash : décide de manière autonome sur quels plans placer une carte éducative (conclusion / moment clé) et règle la parallaxe 3D.'
  },
  {
    agentId: 'sound_engineer',
    agentName: 'Bilal (Ingénieur Son & Phonétique)',
    roleTitle: 'Voix Gemini 3.8 + Qwen3, Phonétique & Ambiance',
    provider: 'gemini_free',
    modelId: 'gemini-3.1-flash-lite',
    temperature: 0.2,
    maxContextTokens: 1500,
    rationale: 'Adaptation immédiate de l’ambiance sonore et de la distribution vocale selon tes consignes avec Cache Vocal SQLite.'
  },
  {
    agentId: 'video_editor',
    agentName: 'Nadia (Monteuse Cinéma 9:16)',
    roleTitle: 'Parallaxe 3D Multi-Couches, Transitions xfade & Rendu MP4',
    provider: 'gemini_free',
    modelId: 'gemini-3.1-flash-lite',
    temperature: 0.15,
    maxContextTokens: 1500,
    rationale: 'Compositing FFmpeg multi-couches (Parallaxe 3D fond/personnages, rayons lumineux animés, transitions fluides et apparition animée des cartes).'
  }
];

const INITIAL_LEARNED_RULES: Array<{ agentId: AgentId; rule: string }> = [
  {
    agentId: 'director',
    rule: 'Toujours ancrer les épisodes dans la vie réelle du bâtiment HLM et la diversité de ses habitants, sans jamais tomber dans le cliché culturel.'
  },
  {
    agentId: 'researcher',
    rule: 'Vérifier systématiquement qu’aucun Prophète ni ange n’est représenté visuellement et que chaque source citée est authentique.'
  },
  {
    agentId: 'scriptwriter',
    rule: 'Le Hook des 3 premières secondes doit faire moins de 15 mots et poser une situation humaine immédiate ou une question touchante.'
  },
  {
    agentId: 'illustrator',
    rule: 'Ne jamais surcharger tous les plans avec des cartes éducatives : laisser respirer les scènes et réserver les cartes aux moments clés ou en conclusion.'
  }
];

function seedDatabase() {
  const existingResidents = db.prepare('SELECT COUNT(*) as count FROM residents').get() as { count: number };
  if (existingResidents.count === 0) {
    const insertRes = db.prepare('INSERT INTO residents (id, profile_json) VALUES (?, ?)');
    for (const r of DEFAULT_RESIDENTS) {
      insertRes.run(r.id, JSON.stringify(r));
    }
  }

  // Always upgrade legacy unconfigured openrouter/groq defaults to Gemini 3.5 Flash
  const insertMod = db.prepare('INSERT OR REPLACE INTO agent_models (agent_id, config_json) VALUES (?, ?)');
  const currentRows = db.prepare('SELECT agent_id, config_json FROM agent_models').all() as Array<{
    agent_id: string;
    config_json: string;
  }>;
  if (currentRows.length === 0) {
    for (const m of DEFAULT_AGENT_MODELS) {
      insertMod.run(m.agentId, JSON.stringify(m));
    }
  } else {
    for (const m of DEFAULT_AGENT_MODELS) {
      const existing = currentRows.find(r => r.agent_id === m.agentId);
      if (!existing) {
        insertMod.run(m.agentId, JSON.stringify(m));
      } else {
        const parsed = JSON.parse(existing.config_json) as AgentModelConfig;
        if (parsed.provider === 'openrouter_free' || parsed.provider === 'groq_free') {
          insertMod.run(m.agentId, JSON.stringify(m));
        }
      }
    }
  }

  const existingRules = db.prepare('SELECT COUNT(*) as count FROM learned_rules').get() as { count: number };
  if (existingRules.count === 0) {
    const insertRule = db.prepare(
      'INSERT INTO learned_rules (agent_id, rule_text, source_feedback, created_at) VALUES (?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    for (const r of INITIAL_LEARNED_RULES) {
      insertRule.run(r.agentId, r.rule, 'Configuration initiale Al Nour', now);
    }
  }
}

seedDatabase();

export const MemoryStore = {
  getResidents(): ResidentProfile[] {
    const rows = db.prepare('SELECT profile_json FROM residents').all() as Array<{ profile_json: string }>;
    return rows.map(r => JSON.parse(r.profile_json) as ResidentProfile);
  },

  saveResident(profile: ResidentProfile): void {
    db.prepare('INSERT OR REPLACE INTO residents (id, profile_json) VALUES (?, ?)').run(
      profile.id,
      JSON.stringify(profile)
    );
  },

  getLocations(): LocationProfile[] {
    return DEFAULT_LOCATIONS;
  },

  getAgentModels(): AgentModelConfig[] {
    const rows = db.prepare('SELECT config_json FROM agent_models').all() as Array<{ config_json: string }>;
    return rows.map(r => JSON.parse(r.config_json) as AgentModelConfig);
  },

  getAgentModel(agentId: AgentId): AgentModelConfig {
    const row = db.prepare('SELECT config_json FROM agent_models WHERE agent_id = ?').get(agentId) as
      | { config_json: string }
      | undefined;
    if (!row) {
      return DEFAULT_AGENT_MODELS.find(m => m.agentId === agentId)!;
    }
    return JSON.parse(row.config_json) as AgentModelConfig;
  },

  updateAgentModel(agentId: AgentId, partial: Partial<AgentModelConfig>): AgentModelConfig {
    const current = this.getAgentModel(agentId);
    const updated = { ...current, ...partial };
    db.prepare('INSERT OR REPLACE INTO agent_models (agent_id, config_json) VALUES (?, ?)').run(
      agentId,
      JSON.stringify(updated)
    );
    return updated;
  },

  getLearnedRules(agentId?: AgentId): Array<{ id: number; agentId: AgentId; ruleText: string; createdAt: string }> {
    const rows = agentId
      ? (db
          .prepare('SELECT id, agent_id, rule_text, created_at FROM learned_rules WHERE agent_id = ? ORDER BY id DESC LIMIT 8')
          .all(agentId) as Array<{ id: number; agent_id: AgentId; rule_text: string; created_at: string }>)
      : (db
          .prepare('SELECT id, agent_id, rule_text, created_at FROM learned_rules ORDER BY id DESC LIMIT 30')
          .all() as Array<{ id: number; agent_id: AgentId; rule_text: string; created_at: string }>);

    return rows.map(r => ({
      id: r.id,
      agentId: r.agent_id,
      ruleText: r.rule_text,
      createdAt: r.created_at
    }));
  },

  addLearnedRule(agentId: AgentId, feedbackText: string): string {
    const condensedRule =
      feedbackText.length > 140 ? `${feedbackText.slice(0, 137).trim()}...` : feedbackText.trim();
    db.prepare(
      'INSERT INTO learned_rules (agent_id, rule_text, source_feedback, created_at) VALUES (?, ?, ?, ?)'
    ).run(agentId, condensedRule, feedbackText, new Date().toISOString());
    return condensedRule;
  },

  saveEpisode(episode: Episode): void {
    episode.updatedAt = new Date().toISOString();
    db.prepare(
      `INSERT OR REPLACE INTO episodes (id, topic_prompt, current_gate, active_agent, status, created_at, updated_at, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      episode.id,
      episode.topicPrompt,
      episode.currentGate,
      episode.activeAgent,
      episode.status,
      episode.createdAt,
      episode.updatedAt,
      JSON.stringify(episode)
    );
  },

  getEpisode(id: string): Episode | null {
    const row = db.prepare('SELECT payload_json FROM episodes WHERE id = ?').get(id) as
      | { payload_json: string }
      | undefined;
    return row ? (JSON.parse(row.payload_json) as Episode) : null;
  },

  listEpisodes(): Episode[] {
    const rows = db.prepare('SELECT payload_json FROM episodes ORDER BY updated_at DESC LIMIT 20').all() as Array<{
      payload_json: string;
    }>;
    return rows.map(r => JSON.parse(r.payload_json) as Episode);
  },

  getCachedVoice(cacheKey: string): { filePath: string; durationSec: number } | null {
    const row = db.prepare('SELECT file_path, duration_sec FROM voice_cache WHERE cache_key = ?').get(cacheKey) as
      | { file_path: string; duration_sec: number }
      | undefined;
    if (row && fs.existsSync(row.file_path)) {
      return { filePath: row.file_path, durationSec: row.duration_sec };
    }
    return null;
  },

  saveCachedVoice(
    cacheKey: string,
    speakerId: string,
    engine: string,
    spokenText: string,
    filePath: string,
    durationSec: number
  ): void {
    db.prepare(
      `INSERT OR REPLACE INTO voice_cache (cache_key, speaker_id, engine, spoken_text, file_path, duration_sec, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(cacheKey, speakerId, engine, spokenText, filePath, durationSec, new Date().toISOString());
  },

  getMonitoringStats() {
    const episodes = this.listEpisodes();
    const agentModels = this.getAgentModels();
    const cacheRows = db
      .prepare('SELECT speaker_id, engine, duration_sec, created_at FROM voice_cache ORDER BY created_at DESC')
      .all() as Array<{ speaker_id: string; engine: string; duration_sec: number; created_at: string }>;

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalActualCostUsd = 0;
    let totalStepsExecuted = 0;

    const perAgentStats: Record<
      string,
      {
        agentId: string;
        agentName: string;
        roleTitle: string;
        configuredModel: string;
        provider: string;
        callsCount: number;
        inputTokens: number;
        outputTokens: number;
        actualCostUsd: number;
        lastModelUsed: string;
      }
    > = {};

    for (const m of agentModels) {
      perAgentStats[m.agentId] = {
        agentId: m.agentId,
        agentName: m.agentName,
        roleTitle: m.roleTitle,
        configuredModel: m.modelId,
        provider: m.provider,
        callsCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        actualCostUsd: 0,
        lastModelUsed: m.modelId
      };
    }

    for (const ep of episodes) {
      const steps = Object.values(ep.steps).filter(Boolean);
      for (const st of steps) {
        if (!st) continue;
        totalStepsExecuted += 1;
        const inp = st.tokensUsed?.input || 0;
        const out = st.tokensUsed?.output || 0;
        const cost = st.tokensUsed?.costUsd || 0;
        totalInputTokens += inp;
        totalOutputTokens += out;
        totalActualCostUsd += cost;

        const ag = perAgentStats[st.agentId];
        if (ag) {
          ag.callsCount += 1;
          ag.inputTokens += inp;
          ag.outputTokens += out;
          ag.actualCostUsd += cost;
          if (st.modelUsed) ag.lastModelUsed = st.modelUsed;
        }
      }
    }

    // Calculate equivalent commercial API cost saved (e.g. GPT-4o + ElevenLabs + Midjourney equivalent)
    const estimatedCommercialLlmUsd = ((totalInputTokens * 2.5 + totalOutputTokens * 10.0) / 1_000_000);
    const totalVoiceSec = cacheRows.reduce((acc, r) => acc + (r.duration_sec || 0), 0);
    const estimatedCommercialTtsUsd = (totalVoiceSec / 60) * 0.18; // ElevenLabs ~$0.18/min
    const estimatedCommercialSavedEur = Number(((estimatedCommercialLlmUsd + estimatedCommercialTtsUsd) * 0.92).toFixed(2));

    const voiceEnginesBreakdown: Record<string, number> = {};
    for (const r of cacheRows) {
      voiceEnginesBreakdown[r.engine] = (voiceEnginesBreakdown[r.engine] || 0) + 1;
    }

    return {
      totalEpisodes: episodes.length,
      completedEpisodes: episodes.filter(e => e.currentGate === 'completed' || Boolean(e.steps.video)).length,
      totalStepsExecuted,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      actualCostEur: Number((totalActualCostUsd * 0.92).toFixed(4)),
      estimatedCommercialSavedEur,
      voiceCache: {
        totalCachedSegments: cacheRows.length,
        totalDurationSec: Math.round(totalVoiceSec),
        enginesBreakdown: voiceEnginesBreakdown
      },
      ttsStack: [
        {
          tier: 'Primaire Adultes (Arabe Vocalisé Natif)',
          engine: 'Google Gemini 3.8 Flash TTS / Lite / 3.1 Preview',
          voices: 'Charon (Ibrahim), Puck (Tariq), Aoede (Amina), Kore (Khadija), Fenrir (Martin/Narrateur)',
          cost: '0,00 € (Free Tier 30 req/j cumulées + Cache SQLite)'
        },
        {
          tier: 'Primaire Enfants & Backup Cloud',
          engine: 'Qwen3-TTS 1.7B Voice Design (Alibaba Cloud / HF)',
          voices: 'Adam (10 ans, voix enfantine aiguë) & Lina (6 ans, petite fille)',
          cost: '0,00 € (Open-Weight Gradio API + Cache SQLite)'
        },
        {
          tier: 'Secours Hors-Ligne Local',
          engine: 'Piper-TTS Neural ONNX (CPU VPS)',
          voices: 'fr_FR-tom-medium / fr_FR-siwis-medium / fr_FR-upmc-medium',
          cost: '0,00 € (100% Local Hors-Ligne)'
        }
      ],
      agents: Object.values(perAgentStats)
    };
  }
};

