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
    provider: 'openrouter_free',
    modelId: 'deepseek/deepseek-r1:free',
    temperature: 0.5,
    maxContextTokens: 1800,
    rationale: 'Modèle de raisonnement profond pour choisir le meilleur angle émotionnel, éviter les clichés et sélectionner les habitants du HLM.'
  },
  {
    agentId: 'researcher',
    agentName: 'Salma (Chercheuse & Éthique)',
    roleTitle: 'Vérification des Sources & Charte Éthique',
    provider: 'openrouter_free',
    modelId: 'deepseek/deepseek-r1:free',
    temperature: 0.2,
    maxContextTokens: 2000,
    rationale: 'Température basse (0.2) et fort raisonnement pour garantir l’exactitude des versets/hadiths et le respect strict de la charte sans visage.'
  },
  {
    agentId: 'scriptwriter',
    agentName: 'Karim (Scénariste TikTok)',
    roleTitle: 'Storytelling 40–60s & Hooks',
    provider: 'openrouter_free',
    modelId: 'meta-llama/llama-3.3-70b-instruct:free',
    temperature: 0.65,
    maxContextTokens: 2200,
    rationale: 'Plume fluide, naturelle et chaleureuse en français pour des hooks de 3 secondes captivants et des dialogues sincères.'
  },
  {
    agentId: 'illustrator',
    agentName: 'Leïla (Directrice Artistique 2D)',
    roleTitle: 'Composition des Plans 9:16 & Prompts Flux',
    provider: 'groq_free',
    modelId: 'llama-3.1-8b-instant',
    temperature: 0.3,
    maxContextTokens: 1500,
    rationale: 'Modèle ultra-rapide et économe en tokens pour traduire le script validé en paramètres de scène 2D/SVG et prompts Flux.'
  },
  {
    agentId: 'sound_engineer',
    agentName: 'Bilal (Ingénieur Son & Phonétique)',
    roleTitle: 'Voix-Off FR, Phonétique Islamique & Ambiance',
    provider: 'groq_free',
    modelId: 'llama-3.1-8b-instant',
    temperature: 0.2,
    maxContextTokens: 1200,
    rationale: 'Tâche déterministe et légère : application du dictionnaire phonétique, synthèse Edge-TTS et sélection de l’ambiance sonore.'
  },
  {
    agentId: 'video_editor',
    agentName: 'Nadia (Monteuse 9:16)',
    roleTitle: 'Animation Ken Burns, Sous-titres Dorés & Rendu MP4',
    provider: 'groq_free',
    modelId: 'llama-3.1-8b-instant',
    temperature: 0.1,
    maxContextTokens: 1200,
    rationale: 'Orchestration technique FFmpeg, synchronisation des sous-titres dorés mot-à-mot et contrôle qualité du MP4 final.'
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
    rule: 'Tariq et Ibrahim sont toujours sans barbe en tenue civile sobre ; Amina et Khadija portent un voile sobre sans uniforme de métier.'
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

  const existingModels = db.prepare('SELECT COUNT(*) as count FROM agent_models').get() as { count: number };
  if (existingModels.count === 0) {
    const insertMod = db.prepare('INSERT INTO agent_models (agent_id, config_json) VALUES (?, ?)');
    for (const m of DEFAULT_AGENT_MODELS) {
      insertMod.run(m.agentId, JSON.stringify(m));
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
  }
};

