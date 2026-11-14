import { MemoryStore } from './memory-store.js';
import { AgentId, SelfCritique } from './types.js';
import { ZeroNoiseContextPacket } from './context-builder.js';

export interface ModelExecutionResult<T> {
  modelUsed: string;
  tokensUsed: { input: number; output: number; costUsd: number };
  deliverable: T;
  selfCritique: SelfCritique;
}

export async function executeAgentModel<T>(
  agentId: AgentId,
  systemInstruction: string,
  contextPacket: ZeroNoiseContextPacket,
  autonomousGenerator: (ctx: ZeroNoiseContextPacket) => Promise<{ deliverable: T; selfCritique: SelfCritique }>
): Promise<ModelExecutionResult<T>> {
  const config = MemoryStore.getAgentModel(agentId);

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

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
        const parsed = JSON.parse(rawText) as { deliverable: T; selfCritique: SelfCritique };
        if (parsed.deliverable && parsed.selfCritique) {
          return {
            modelUsed: `${config.modelId} (${config.provider})`,
            tokensUsed: {
              input: data.usage?.prompt_tokens ?? contextPacket.estimatedPromptTokens,
              output: data.usage?.completion_tokens ?? Math.ceil(rawText.length / 4),
              costUsd: 0
            },
            deliverable: parsed.deliverable,
            selfCritique: parsed.selfCritique
          };
        }
      }
    } catch {
      // Fallback transparently to autonomous deterministic engine
    }
  }

  const generated = await autonomousGenerator(contextPacket);
  const outputStr = JSON.stringify(generated);

  return {
    modelUsed: `${config.modelId} [Mode Gratuit 0€]`,
    tokensUsed: {
      input: contextPacket.estimatedPromptTokens,
      output: Math.ceil(outputStr.length / 4),
      costUsd: 0
    },
    deliverable: generated.deliverable,
    selfCritique: generated.selfCritique
  };
}
