import fs from 'node:fs';
import path from 'node:path';
import { MemoryStore } from './memory-store.js';
import { AgentId, SelfCritique } from './types.js';
import { ZeroNoiseContextPacket } from './context-builder.js';

export interface ModelExecutionResult<T> {
  modelUsed: string;
  tokensUsed: { input: number; output: number; costUsd: number };
  deliverable: T;
  selfCritique: SelfCritique;
  appliedRevisionSummary?: string;
}

function getGeminiApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
      if (match && match[1]) return match[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // ignore
  }
  return '';
}

function cleanJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return trimmed;
}

export async function executeAgentModel<T>(
  agentId: AgentId,
  systemInstruction: string,
  contextPacket: ZeroNoiseContextPacket,
  autonomousGenerator: (ctx: ZeroNoiseContextPacket) => Promise<{
    deliverable: T;
    selfCritique: SelfCritique;
    appliedRevisionSummary?: string;
  }>
): Promise<ModelExecutionResult<T>> {
  const config = MemoryStore.getAgentModel(agentId);
  const geminiKey = getGeminiApiKey();
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  // 1. Primary Execution via Gemini 3.5 Flash / 3.1 Flash Lite (when GEMINI_API_KEY is present)
  if (geminiKey && (config.provider === 'gemini_free' || (!openRouterKey && !groqKey && !openAiKey))) {
    const candidateModels = Array.from(
      new Set([
        config.modelId.startsWith('gemini-') ? config.modelId : 'gemini-3.5-flash',
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite'
      ])
    );

    const revisionDirective = contextPacket.userRevisionFeedback
      ? `\n\n⚠️ CONSIGNE PRIORITAIRE DE L'UTILISATEUR À APPLIQUER OBLIGATOIREMENT :\n« ${contextPacket.userRevisionFeedback} »\nTu reçois dans "previousDeliverable" ton livrable précédent. Tu DOIS le modifier concrètement et fidèlement pour respecter cette consigne à 100%, et remplir le champ JSON "appliedRevisionSummary" (1 à 2 phrases en français expliquant exactement ce que tu as changé suite à cette consigne).`
      : '';

    const fullSystemPrompt = `${systemInstruction}${revisionDirective}\nRéponds strictement en JSON valide avec la structure exacte : { "deliverable": ..., "selfCritique": { "score": number, "strengths": string[], "risksOrDoubts": string[], "suggestedAlternative": string }, "appliedRevisionSummary": string }`;

    const userPayload = JSON.stringify({
      topicPrompt: contextPacket.topicPrompt,
      charterSummary: contextPacket.charterSummary,
      learnedRules: contextPacket.learnedRules,
      relevantResidents: contextPacket.relevantResidents,
      relevantLocations: contextPacket.relevantLocations,
      upstreamDeliverables: contextPacket.upstreamDeliverables,
      previousDeliverable: contextPacket.previousDeliverable,
      userRevisionFeedback: contextPacket.userRevisionFeedback
    });

    for (const modelName of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(16000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: fullSystemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPayload }] }],
            generationConfig: {
              temperature: config.temperature ?? 0.4,
              responseMimeType: 'application/json'
            }
          })
        });

        if (response.ok) {
          const data = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
          };
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawText) {
            const parsed = JSON.parse(cleanJsonText(rawText)) as {
              deliverable?: T;
              selfCritique?: SelfCritique;
              appliedRevisionSummary?: string;
            };
            if (
              parsed &&
              parsed.deliverable &&
              parsed.selfCritique &&
              Array.isArray(parsed.selfCritique.strengths)
            ) {
              return {
                modelUsed: `${modelName} (Gemini Cloud Actif)`,
                tokensUsed: {
                  input: data.usageMetadata?.promptTokenCount ?? contextPacket.estimatedPromptTokens,
                  output: data.usageMetadata?.candidatesTokenCount ?? Math.ceil(rawText.length / 4),
                  costUsd: 0
                },
                deliverable: parsed.deliverable,
                selfCritique: parsed.selfCritique,
                appliedRevisionSummary:
                  parsed.appliedRevisionSummary ||
                  (contextPacket.userRevisionFeedback
                    ? `Consigne « ${contextPacket.userRevisionFeedback} » appliquée par ${modelName}.`
                    : undefined)
              };
            }
          }
        }
      } catch {
        // Try next Gemini model in cascade
      }
    }
  }

  // 2. Secondary Execution via OpenRouter / Groq / OpenAI if configured
  const canCallRemote =
    (config.provider === 'openrouter_free' && Boolean(openRouterKey)) ||
    (config.provider === 'groq_free' && Boolean(groqKey)) ||
    (config.provider === 'custom_openai' && Boolean(openAiKey));

  if (canCallRemote) {
    try {
      const endpoint =
        config.provider === 'openrouter_free'
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : config.provider === 'groq_free'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';

      const apiKey =
        config.provider === 'openrouter_free'
          ? openRouterKey
          : config.provider === 'groq_free'
          ? groqKey
          : openAiKey;

      const userPayload = JSON.stringify({
        topicPrompt: contextPacket.topicPrompt,
        learnedRules: contextPacket.learnedRules,
        relevantResidents: contextPacket.relevantResidents,
        relevantLocations: contextPacket.relevantLocations,
        upstreamDeliverables: contextPacket.upstreamDeliverables,
        previousDeliverable: contextPacket.previousDeliverable,
        userRevisionFeedback: contextPacket.userRevisionFeedback
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config.modelId,
          temperature: config.temperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPayload }
          ]
        })
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const rawText = data.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(cleanJsonText(rawText)) as {
          deliverable: T;
          selfCritique: SelfCritique;
          appliedRevisionSummary?: string;
        };
        if (parsed.deliverable && parsed.selfCritique) {
          return {
            modelUsed: `${config.modelId} (${config.provider})`,
            tokensUsed: {
              input: data.usage?.prompt_tokens ?? contextPacket.estimatedPromptTokens,
              output: data.usage?.completion_tokens ?? Math.ceil(rawText.length / 4),
              costUsd: 0
            },
            deliverable: parsed.deliverable,
            selfCritique: parsed.selfCritique,
            appliedRevisionSummary: parsed.appliedRevisionSummary
          };
        }
      }
    } catch {
      // Fallback transparently to autonomous deterministic engine
    }
  }

  // 3. Offline / Deterministic Fallback Engine (with instruction parser)
  const generated = await autonomousGenerator(contextPacket);
  const outputStr = JSON.stringify(generated);

  return {
    modelUsed: `${config.modelId} [Moteur Local Al Nour]`,
    tokensUsed: {
      input: contextPacket.estimatedPromptTokens,
      output: Math.ceil(outputStr.length / 4),
      costUsd: 0
    },
    deliverable: generated.deliverable,
    selfCritique: generated.selfCritique,
    appliedRevisionSummary: generated.appliedRevisionSummary
  };
}
