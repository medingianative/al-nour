import { ETHICAL_AND_DA_CHARTER, LocationProfile, ResidentProfile } from '../bible/series-bible.js';
import { MemoryStore } from './memory-store.js';
import { AgentId, Episode } from './types.js';

export interface ZeroNoiseContextPacket {
  agentId: AgentId;
  episodeId: string;
  topicPrompt: string;
  charterSummary: string[];
  learnedRules: string[];
  relevantResidents: Array<Pick<ResidentProfile, 'id' | 'name' | 'age' | 'apartment' | 'roleInBuilding' | 'profession' | 'personalityTraits' | 'outfitDescription'>>;
  relevantLocations: Array<Pick<LocationProfile, 'id' | 'name' | 'category' | 'description'>>;
  upstreamDeliverables: Record<string, unknown>;
  previousDeliverable?: unknown;
  userRevisionFeedback?: string;
  estimatedPromptTokens: number;
}

export function buildZeroNoiseContext(
  agentId: AgentId,
  episode: Episode,
  userRevisionFeedback?: string
): ZeroNoiseContextPacket {
  const allResidents = MemoryStore.getResidents();
  const allLocations = MemoryStore.getLocations();
  const learnedRules = MemoryStore.getLearnedRules(agentId).map(r => r.ruleText);

  // Filter residents & locations to ONLY those featured in the episode ( once Gate 1 is done )
  const featuredResidentIds = episode.steps.idea?.deliverable.featuredResidents;
  const featuredLocationIds = episode.steps.idea?.deliverable.primaryLocations;

  const relevantResidents = (
    featuredResidentIds && featuredResidentIds.length > 0
      ? allResidents.filter(r => featuredResidentIds.includes(r.id))
      : allResidents
  ).map(r => ({
    id: r.id,
    name: r.name,
    age: r.age,
    apartment: r.apartment,
    roleInBuilding: r.roleInBuilding,
    profession: r.profession,
    personalityTraits: r.personalityTraits,
    outfitDescription: r.outfitDescription
  }));

  const relevantLocations = (
    featuredLocationIds && featuredLocationIds.length > 0
      ? allLocations.filter(l => featuredLocationIds.includes(l.id))
      : allLocations
  ).map(l => ({
    id: l.id,
    name: l.name,
    category: l.category,
    description: l.description
  }));

  // Strictly pass ONLY the immediate upstream deliverables needed by this specific agent + its own previousDeliverable when revising
  const upstreamDeliverables: Record<string, unknown> = {};
  let previousDeliverable: unknown = undefined;

  if (agentId === 'director') {
    previousDeliverable = episode.steps.idea?.deliverable;
  } else if (agentId === 'researcher') {
    if (episode.steps.idea) upstreamDeliverables.idea = episode.steps.idea.deliverable;
    previousDeliverable = episode.steps.research?.deliverable;
  } else if (agentId === 'scriptwriter') {
    upstreamDeliverables.idea = episode.steps.idea?.deliverable;
    upstreamDeliverables.research = episode.steps.research?.deliverable;
    previousDeliverable = episode.steps.script?.deliverable;
  } else if (agentId === 'illustrator') {
    upstreamDeliverables.idea = episode.steps.idea?.deliverable;
    upstreamDeliverables.research = episode.steps.research?.deliverable;
    upstreamDeliverables.script = episode.steps.script?.deliverable;
    previousDeliverable = episode.steps.visuals?.deliverable || episode.steps.prompts?.deliverable;
  } else if (agentId === 'sound_engineer') {
    upstreamDeliverables.script = {
      narratorVoiceProfile: episode.steps.script?.deliverable.narratorVoiceProfile,
      fullNarrationText: episode.steps.script?.deliverable.fullNarrationText,
      scenes: episode.steps.script?.deliverable.scenes
    };
    previousDeliverable = episode.steps.audio?.deliverable;
  } else if (agentId === 'video_editor') {
    upstreamDeliverables.visuals = episode.steps.visuals?.deliverable;
    upstreamDeliverables.audio = episode.steps.audio?.deliverable;
    previousDeliverable = episode.steps.video?.deliverable;
  }

  const rawJson = JSON.stringify({
    topicPrompt: episode.topicPrompt,
    learnedRules,
    relevantResidents,
    relevantLocations,
    upstreamDeliverables,
    previousDeliverable,
    userRevisionFeedback
  });

  const estimatedPromptTokens = Math.ceil(rawJson.length / 3.8);

  return {
    agentId,
    episodeId: episode.id,
    topicPrompt: episode.topicPrompt,
    charterSummary: ETHICAL_AND_DA_CHARTER,
    learnedRules,
    relevantResidents,
    relevantLocations,
    upstreamDeliverables,
    previousDeliverable,
    userRevisionFeedback,
    estimatedPromptTokens
  };
}
