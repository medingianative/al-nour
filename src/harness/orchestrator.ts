import { EventEmitter } from 'node:events';
import { StudioAgents } from '../agents/studio-agents.js';
import { MemoryStore } from './memory-store.js';
import {
  AgentId,
  Episode,
  ValidationGateId
} from './types.js';

export interface StudioLiveEvent {
  type:
    | 'agent_started'
    | 'agent_completed_awaiting_validation'
    | 'gate_approved'
    | 'agent_revision_requested'
    | 'episode_completed';
  episodeId: string;
  gateId: ValidationGateId;
  agentId: AgentId | null;
  message: string;
  timestamp: string;
  episode: Episode;
}

class AlNourOrchestrator extends EventEmitter {
  private recentEvents: StudioLiveEvent[] = [];

  private emitStudioEvent(event: Omit<StudioLiveEvent, 'timestamp'>) {
    const fullEvent: StudioLiveEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    this.recentEvents.unshift(fullEvent);
    if (this.recentEvents.length > 50) {
      this.recentEvents.pop();
    }
    this.emit('studio_event', fullEvent);
  }

  public getRecentEvents(): StudioLiveEvent[] {
    return this.recentEvents;
  }

  public async createEpisode(topicPrompt: string): Promise<Episode> {
    const id = `ep_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const episode: Episode = {
      id,
      topicPrompt: topicPrompt.trim(),
      createdAt: now,
      updatedAt: now,
      currentGate: '1_idea',
      activeAgent: 'director',
      status: 'agent_working',
      steps: {}
    };

    MemoryStore.saveEpisode(episode);
    await this.executeGateStep(episode.id, '1_idea');
    return MemoryStore.getEpisode(episode.id)!;
  }

  public async executeGateStep(
    episodeId: string,
    gateId: ValidationGateId,
    userFeedback?: string,
    options?: { singleSceneToRegenerate?: number; toggleFluxForScene?: number }
  ): Promise<Episode> {
    const episode = MemoryStore.getEpisode(episodeId);
    if (!episode) {
      throw new Error(`Épisode introuvable: ${episodeId}`);
    }

    const gateToAgent: Record<Exclude<ValidationGateId, 'completed'>, AgentId> = {
      '1_idea': 'director',
      '2_research': 'researcher',
      '3_script': 'scriptwriter',
      '4a_prompts': 'illustrator',
      '4b_visuals': 'illustrator',
      '5_audio': 'sound_engineer',
      '6_video': 'video_editor'
    };

    if (gateId === 'completed') {
      episode.status = 'completed';
      episode.activeAgent = null;
      MemoryStore.saveEpisode(episode);
      return episode;
    }

    const agentId = gateToAgent[gateId];
    episode.currentGate = gateId;
    episode.activeAgent = agentId;
    episode.status = 'agent_working';
    MemoryStore.saveEpisode(episode);

    this.emitStudioEvent({
      type: 'agent_started',
      episodeId: episode.id,
      gateId,
      agentId,
      message: `L'agent [${agentId}] travaille sur l'étape ${gateId} et prépare son autocritique...`,
      episode
    });

    const now = new Date().toISOString();

    if (gateId === '1_idea') {
      const res = await StudioAgents.runDirector(episode, userFeedback);
      const history = episode.steps.idea?.userFeedbackHistory || [];
      if (userFeedback) history.push(userFeedback);
      episode.steps.idea = {
        agentId: 'director',
        gateId: '1_idea',
        createdAt: now,
        modelUsed: res.modelUsed,
        tokensUsed: res.tokensUsed,
        deliverable: res.deliverable,
        selfCritique: res.selfCritique,
        userFeedbackHistory: history,
        approved: false
      };
    } else if (gateId === '2_research') {
      const res = await StudioAgents.runResearcher(episode, userFeedback);
      const history = episode.steps.research?.userFeedbackHistory || [];
      if (userFeedback) history.push(userFeedback);
      episode.steps.research = {
        agentId: 'researcher',
        gateId: '2_research',
        createdAt: now,
        modelUsed: res.modelUsed,
        tokensUsed: res.tokensUsed,
        deliverable: res.deliverable,
        selfCritique: res.selfCritique,
        userFeedbackHistory: history,
        approved: false
      };
    } else if (gateId === '3_script') {
      const res = await StudioAgents.runScriptwriter(episode, userFeedback);
      const history = episode.steps.script?.userFeedbackHistory || [];
      if (userFeedback) history.push(userFeedback);
      episode.steps.script = {
        agentId: 'scriptwriter',
        gateId: '3_script',
        createdAt: now,
        modelUsed: res.modelUsed,
        tokensUsed: res.tokensUsed,
        deliverable: res.deliverable,
        selfCritique: res.selfCritique,
        userFeedbackHistory: history,
        approved: false
      };
    } else if (gateId === '4a_prompts') {
      const res = await StudioAgents.runIllustratorPrompts(episode, userFeedback);
      const history = episode.steps.prompts?.userFeedbackHistory || [];
      if (userFeedback) history.push(userFeedback);
      episode.steps.prompts = {
        agentId: 'illustrator',
        gateId: '4a_prompts',
        createdAt: now,
        modelUsed: res.modelUsed,
        tokensUsed: res.tokensUsed,
        deliverable: res.deliverable,
        selfCritique: res.selfCritique,
        userFeedbackHistory: history,
        approved: false
      };
    } else if (gateId === '4b_visuals') {
      const res = await StudioAgents.runIllustratorRender(
        episode,
        options?.singleSceneToRegenerate,
        options?.toggleFluxForScene
      );
      const history = episode.steps.visuals?.userFeedbackHistory || [];
      if (userFeedback) history.push(userFeedback);
      episode.steps.visuals = {
        agentId: 'illustrator',
        gateId: '4b_visuals',
        createdAt: now,
        modelUsed: res.modelUsed,
        tokensUsed: res.tokensUsed,
        deliverable: res.deliverable,
        selfCritique: res.selfCritique,
        userFeedbackHistory: history,
        approved: false
      };
    } else if (gateId === '5_audio') {
      const res = await StudioAgents.runSoundEngineer(episode, userFeedback);
      const history = episode.steps.audio?.userFeedbackHistory || [];
      if (userFeedback) history.push(userFeedback);
      episode.steps.audio = {
        agentId: 'sound_engineer',
        gateId: '5_audio',
        createdAt: now,
        modelUsed: res.modelUsed,
        tokensUsed: res.tokensUsed,
        deliverable: res.deliverable,
        selfCritique: res.selfCritique,
        userFeedbackHistory: history,
        approved: false
      };
    } else if (gateId === '6_video') {
      const res = await StudioAgents.runVideoEditor(episode);
      const history = episode.steps.video?.userFeedbackHistory || [];
      if (userFeedback) history.push(userFeedback);
      episode.steps.video = {
        agentId: 'video_editor',
        gateId: '6_video',
        createdAt: now,
        modelUsed: res.modelUsed,
        tokensUsed: res.tokensUsed,
        deliverable: res.deliverable,
        selfCritique: res.selfCritique,
        userFeedbackHistory: history,
        approved: false
      };
    }

    // STOP AND WAIT FOR USER VALIDATION BEFORE PASSING TO NEXT AGENT
    episode.status = 'awaiting_user_validation';
    MemoryStore.saveEpisode(episode);

    this.emitStudioEvent({
      type: 'agent_completed_awaiting_validation',
      episodeId: episode.id,
      gateId,
      agentId,
      message: `Porte [${gateId}] prête avec autocritique — en attente de ta validation pour passer à l'agent suivant.`,
      episode
    });

    return episode;
  }

  public async approveCurrentGate(episodeId: string): Promise<Episode> {
    const episode = MemoryStore.getEpisode(episodeId);
    if (!episode) {
      throw new Error(`Épisode introuvable: ${episodeId}`);
    }

    const nextGateMap: Record<ValidationGateId, ValidationGateId> = {
      '1_idea': '2_research',
      '2_research': '3_script',
      '3_script': '4a_prompts',
      '4a_prompts': '4b_visuals',
      '4b_visuals': '5_audio',
      '5_audio': '6_video',
      '6_video': 'completed',
      completed: 'completed'
    };

    const current = episode.currentGate;
    if (current === '1_idea' && episode.steps.idea) episode.steps.idea.approved = true;
    if (current === '2_research' && episode.steps.research) episode.steps.research.approved = true;
    if (current === '3_script' && episode.steps.script) episode.steps.script.approved = true;
    if (current === '4a_prompts' && episode.steps.prompts) episode.steps.prompts.approved = true;
    if (current === '4b_visuals' && episode.steps.visuals) episode.steps.visuals.approved = true;
    if (current === '5_audio' && episode.steps.audio) episode.steps.audio.approved = true;
    if (current === '6_video' && episode.steps.video) episode.steps.video.approved = true;

    const nextGate = nextGateMap[current];

    this.emitStudioEvent({
      type: 'gate_approved',
      episodeId: episode.id,
      gateId: current,
      agentId: episode.activeAgent,
      message: `Porte [${current}] validée par toi ! Passage du dossier à l'étape [${nextGate}].`,
      episode
    });

    if (nextGate === 'completed') {
      episode.currentGate = 'completed';
      episode.activeAgent = null;
      episode.status = 'completed';
      MemoryStore.saveEpisode(episode);
      this.emitStudioEvent({
        type: 'episode_completed',
        episodeId: episode.id,
        gateId: 'completed',
        agentId: null,
        message: `Épisode [${episode.id}] entièrement validé et prêt pour publication TikTok !`,
        episode
      });
      return episode;
    }

    return this.executeGateStep(episode.id, nextGate);
  }

  public async requestRevision(
    episodeId: string,
    feedbackText: string,
    learnRule: boolean = true
  ): Promise<Episode> {
    const episode = MemoryStore.getEpisode(episodeId);
    if (!episode) {
      throw new Error(`Épisode introuvable: ${episodeId}`);
    }

    const activeAgent = episode.activeAgent || 'director';
    if (learnRule && feedbackText.trim().length > 4) {
      MemoryStore.addLearnedRule(activeAgent, feedbackText);
    }

    this.emitStudioEvent({
      type: 'agent_revision_requested',
      episodeId: episode.id,
      gateId: episode.currentGate,
      agentId: activeAgent,
      message: `Retouche demandée à [${activeAgent}] : « ${feedbackText} » (Règle enregistrée en mémoire).`,
      episode
    });

    return this.executeGateStep(episode.id, episode.currentGate, feedbackText);
  }
}

export const Orchestrator = new AlNourOrchestrator();
