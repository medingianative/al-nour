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
    let appliedSummaryText: string | undefined;

    if (gateId === '1_idea') {
      const res = await StudioAgents.runDirector(episode, userFeedback);
      appliedSummaryText = res.appliedRevisionSummary;
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
        appliedRevisionSummary: res.appliedRevisionSummary,
        approved: false,
        stale: false
      };
      if (episode.steps.research) episode.steps.research.stale = true;
      if (episode.steps.script) episode.steps.script.stale = true;
      if (episode.steps.prompts) episode.steps.prompts.stale = true;
      if (episode.steps.visuals) episode.steps.visuals.stale = true;
      if (episode.steps.audio) episode.steps.audio.stale = true;
      if (episode.steps.video) episode.steps.video.stale = true;
    } else if (gateId === '2_research') {
      const res = await StudioAgents.runResearcher(episode, userFeedback);
      appliedSummaryText = res.appliedRevisionSummary;
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
        appliedRevisionSummary: res.appliedRevisionSummary,
        approved: false,
        stale: false
      };
      if (episode.steps.script) episode.steps.script.stale = true;
      if (episode.steps.prompts) episode.steps.prompts.stale = true;
      if (episode.steps.visuals) episode.steps.visuals.stale = true;
      if (episode.steps.audio) episode.steps.audio.stale = true;
      if (episode.steps.video) episode.steps.video.stale = true;
    } else if (gateId === '3_script') {
      const res = await StudioAgents.runScriptwriter(episode, userFeedback);
      appliedSummaryText = res.appliedRevisionSummary;
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
        appliedRevisionSummary: res.appliedRevisionSummary,
        approved: false,
        stale: false
      };
      if (episode.steps.prompts) episode.steps.prompts.stale = true;
      if (episode.steps.visuals) episode.steps.visuals.stale = true;
      if (episode.steps.audio) episode.steps.audio.stale = true;
      if (episode.steps.video) episode.steps.video.stale = true;
    } else if (gateId === '4a_prompts') {
      const res = await StudioAgents.runIllustratorPrompts(episode, userFeedback);
      appliedSummaryText = res.appliedRevisionSummary;
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
        appliedRevisionSummary: res.appliedRevisionSummary,
        approved: false,
        stale: false
      };
      if (episode.steps.visuals) episode.steps.visuals.stale = true;
      if (episode.steps.video) episode.steps.video.stale = true;
    } else if (gateId === '4b_visuals') {
      const res = await StudioAgents.runIllustratorRender(
        episode,
        options?.singleSceneToRegenerate,
        options?.toggleFluxForScene,
        userFeedback
      );
      appliedSummaryText = res.appliedRevisionSummary;
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
        appliedRevisionSummary: res.appliedRevisionSummary,
        approved: false,
        stale: false
      };
      if (episode.steps.video) episode.steps.video.stale = true;
    } else if (gateId === '5_audio') {
      const res = await StudioAgents.runSoundEngineer(episode, userFeedback);
      appliedSummaryText = res.appliedRevisionSummary;
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
        appliedRevisionSummary: res.appliedRevisionSummary,
        approved: false,
        stale: false
      };
      if (episode.steps.video) episode.steps.video.stale = true;
    } else if (gateId === '6_video') {
      const res = await StudioAgents.runVideoEditor(episode, userFeedback);
      appliedSummaryText = res.appliedRevisionSummary;
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
        appliedRevisionSummary: res.appliedRevisionSummary,
        approved: false,
        stale: false
      };
    }

    if (userFeedback) {
      episode.lastRevisionBanner = {
        agentId,
        gateId,
        userInstruction: userFeedback,
        appliedSummary:
          appliedSummaryText ||
          `Consigne « ${userFeedback} » appliquée par ${agentId} sur l'étape ${gateId}.`,
        timestamp: now
      };
    }

    // STOP AND WAIT FOR USER VALIDATION BEFORE PASSING TO NEXT AGENT
    episode.activeAgents = [agentId];
    episode.status = 'awaiting_user_validation';
    MemoryStore.saveEpisode(episode);

    this.emitStudioEvent({
      type: 'agent_completed_awaiting_validation',
      episodeId: episode.id,
      gateId,
      agentId,
      message: userFeedback
        ? `✅ Consigne appliquée par [${agentId}] (${gateId}) : ${episode.lastRevisionBanner?.appliedSummary}`
        : `Porte [${gateId}] prête avec autocritique — en attente de ta validation ou navigation libre dans l'essaim.`,
      episode
    });

    return episode;
  }

  /**
   * Jump directly to any Gate / Agent in the Swarm without losing downstream work.
   * If that gate hasn't been generated yet, generates it immediately.
   */
  public async selectGate(episodeId: string, gateId: ValidationGateId): Promise<Episode> {
    const episode = MemoryStore.getEpisode(episodeId);
    if (!episode) {
      throw new Error(`Épisode introuvable: ${episodeId}`);
    }

    if (gateId === 'completed') {
      episode.currentGate = '6_video';
      episode.activeAgent = 'video_editor';
      episode.activeAgents = ['video_editor'];
      MemoryStore.saveEpisode(episode);
      return episode;
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

    const gateKeyMap: Record<Exclude<ValidationGateId, 'completed'>, keyof Episode['steps']> = {
      '1_idea': 'idea',
      '2_research': 'research',
      '3_script': 'script',
      '4a_prompts': 'prompts',
      '4b_visuals': 'visuals',
      '5_audio': 'audio',
      '6_video': 'video'
    };

    const stepKey = gateKeyMap[gateId];
    const existingStep = episode.steps[stepKey];

    if (!existingStep) {
      return this.executeGateStep(episodeId, gateId);
    }

    episode.currentGate = gateId;
    episode.activeAgent = gateToAgent[gateId];
    episode.activeAgents = [gateToAgent[gateId]];
    episode.status = 'awaiting_user_validation';
    MemoryStore.saveEpisode(episode);

    this.emitStudioEvent({
      type: 'agent_completed_awaiting_validation',
      episodeId: episode.id,
      gateId,
      agentId: episode.activeAgent,
      message: `🎯 Navigation directe vers [${episode.activeAgent}] (Porte ${gateId}) — tu peux modifier son travail à tout moment.`,
      episode
    });

    return episode;
  }

  /**
   * Inline edit of a single scene's spoken dialogue or speaker in Gate 3 (Script)
   * without regenerating the other 7 scenes! Marks Audio & Video as stale (out_of_sync).
   */
  public async updateScriptScene(
    episodeId: string,
    sceneNumber: number,
    spokenText: string,
    speakerId?: string
  ): Promise<Episode> {
    const episode = MemoryStore.getEpisode(episodeId);
    if (!episode || !episode.steps.script) {
      throw new Error(`Script introuvable pour l'épisode ${episodeId}`);
    }

    const SPEAKER_NAMES: Record<string, string> = {
      narrator: 'Narrateur Al Nour',
      tariq: 'Tariq (Père)',
      amina: 'Amina (Mère)',
      adam: 'Adam (10 ans)',
      lina: 'Lina (6 ans)',
      ibrahim: 'Grand-père Ibrahim',
      khadija: 'Grand-mère Khadija',
      martin: 'M. Martin (Voisin)'
    };

    const scriptDeliv = episode.steps.script.deliverable;
    const targetScene = scriptDeliv.scenes.find(s => s.sceneNumber === sceneNumber);
    if (!targetScene) {
      throw new Error(`Plan ${sceneNumber} introuvable dans le script.`);
    }

    const oldSpeaker = targetScene.speakerId;
    targetScene.spokenText = spokenText.trim();
    if (speakerId && SPEAKER_NAMES[speakerId]) {
      targetScene.speakerId = speakerId as any;
      targetScene.speakerDisplayName = SPEAKER_NAMES[speakerId];
    }

    // Recompute fullNarrationText & word count
    scriptDeliv.fullNarrationText = scriptDeliv.scenes.map(s => s.spokenText).join(' ');
    scriptDeliv.totalWordCount = scriptDeliv.fullNarrationText.split(/\s+/).filter(Boolean).length;
    if (sceneNumber === 1) {
      scriptDeliv.hookFirst3Seconds = targetScene.spokenText;
    }

    // Also update subtitleText in existing prompts / visuals if present
    if (episode.steps.prompts?.deliverable.scenes) {
      const pScene = episode.steps.prompts.deliverable.scenes.find(s => s.sceneNumber === sceneNumber);
      if (pScene) {
        pScene.subtitleText = targetScene.spokenText;
        pScene.speakerId = targetScene.speakerId;
        pScene.speakerDisplayName = targetScene.speakerDisplayName;
      }
    }
    if (episode.steps.visuals?.deliverable.scenes) {
      const vScene = episode.steps.visuals.deliverable.scenes.find(s => s.sceneNumber === sceneNumber);
      if (vScene) {
        vScene.subtitleText = targetScene.spokenText;
        vScene.speakerId = targetScene.speakerId;
        vScene.speakerDisplayName = targetScene.speakerDisplayName;
      }
      if (oldSpeaker !== targetScene.speakerId) {
        episode.steps.visuals.stale = true;
      }
    }

    // Mark downstream audio & video as needing synchronization
    if (episode.steps.audio) episode.steps.audio.stale = true;
    if (episode.steps.video) episode.steps.video.stale = true;

    episode.steps.script.userFeedbackHistory.push(
      `[Édition directe Plan ${sceneNumber}] ${targetScene.speakerDisplayName}: "${targetScene.spokenText}"`
    );

    MemoryStore.saveEpisode(episode);
    this.emitStudioEvent({
      type: 'agent_revision_requested',
      episodeId: episode.id,
      gateId: '3_script',
      agentId: 'scriptwriter',
      message: `✏️ Plan ${sceneNumber} modifié en direct ! L'Audio (Cache SQLite 7/8 plans gratuits) et la Vidéo sont marqués ⚠️ À synchroniser.`,
      episode
    });

    return episode;
  }

  /**
   * Parallel Swarm Execution (DAG):
   * Runs Visual Branch (Leïla: 4a_prompts + 4b_visuals) and Audio Branch (Bilal: 5_audio with SQLite cache)
   * simultaneously via Promise.all, then updates Gate 6 (Nadia: Video MP4) if needed.
   */
  public async runParallelSwarmSync(episodeId: string, includeVideo: boolean = true): Promise<Episode> {
    let episode = MemoryStore.getEpisode(episodeId);
    if (!episode) {
      throw new Error(`Épisode introuvable: ${episodeId}`);
    }

    // Ensure upstream foundations exist
    if (!episode.steps.idea) {
      episode = await this.executeGateStep(episodeId, '1_idea');
    }
    if (!episode.steps.research || episode.steps.research.stale) {
      episode = await this.executeGateStep(episodeId, '2_research');
    }
    if (!episode.steps.script || episode.steps.script.stale) {
      episode = await this.executeGateStep(episodeId, '3_script');
    }

    episode.status = 'agent_working';
    episode.activeAgent = 'illustrator';
    episode.activeAgents = ['illustrator', 'sound_engineer'];
    MemoryStore.saveEpisode(episode);

    this.emitStudioEvent({
      type: 'agent_started',
      episodeId: episode.id,
      gateId: '4b_visuals',
      agentId: 'illustrator',
      message: `⚡ Essaim en Parallèle lancé : Leïla (Visuels 9:16) et Bilal (Voix-Off + Cache SQLite) travaillent simultanément !`,
      episode
    });

    const now = new Date().toISOString();

    // Branch A (Illustrator: Prompts + Visuals) and Branch B (Sound Engineer: Multi-Voice Audio) in parallel!
    const visualBranch = (async () => {
      if (!episode!.steps.prompts || episode!.steps.prompts.stale) {
        const pRes = await StudioAgents.runIllustratorPrompts(episode!);
        episode!.steps.prompts = {
          agentId: 'illustrator',
          gateId: '4a_prompts',
          createdAt: now,
          modelUsed: pRes.modelUsed,
          tokensUsed: pRes.tokensUsed,
          deliverable: pRes.deliverable,
          selfCritique: pRes.selfCritique,
          userFeedbackHistory: episode!.steps.prompts?.userFeedbackHistory || [],
          approved: true,
          stale: false
        };
      }
      if (!episode!.steps.visuals || episode!.steps.visuals.stale) {
        const vRes = await StudioAgents.runIllustratorRender(episode!);
        episode!.steps.visuals = {
          agentId: 'illustrator',
          gateId: '4b_visuals',
          createdAt: now,
          modelUsed: vRes.modelUsed,
          tokensUsed: vRes.tokensUsed,
          deliverable: vRes.deliverable,
          selfCritique: vRes.selfCritique,
          userFeedbackHistory: episode!.steps.visuals?.userFeedbackHistory || [],
          approved: true,
          stale: false
        };
      }
    })();

    const audioBranch = (async () => {
      if (!episode!.steps.audio || episode!.steps.audio.stale) {
        const aRes = await StudioAgents.runSoundEngineer(episode!);
        episode!.steps.audio = {
          agentId: 'sound_engineer',
          gateId: '5_audio',
          createdAt: now,
          modelUsed: aRes.modelUsed,
          tokensUsed: aRes.tokensUsed,
          deliverable: aRes.deliverable,
          selfCritique: aRes.selfCritique,
          userFeedbackHistory: episode!.steps.audio?.userFeedbackHistory || [],
          approved: true,
          stale: false
        };
      }
    })();

    await Promise.all([visualBranch, audioBranch]);
    MemoryStore.saveEpisode(episode);

    if (includeVideo || episode.steps.video) {
      episode.activeAgent = 'video_editor';
      episode.activeAgents = ['video_editor'];
      episode.currentGate = '6_video';
      MemoryStore.saveEpisode(episode);

      const vidRes = await StudioAgents.runVideoEditor(episode);
      episode.steps.video = {
        agentId: 'video_editor',
        gateId: '6_video',
        createdAt: new Date().toISOString(),
        modelUsed: vidRes.modelUsed,
        tokensUsed: vidRes.tokensUsed,
        deliverable: vidRes.deliverable,
        selfCritique: vidRes.selfCritique,
        userFeedbackHistory: episode.steps.video?.userFeedbackHistory || [],
        approved: false,
        stale: false
      };
    } else {
      episode.currentGate = '5_audio';
      episode.activeAgent = 'sound_engineer';
      episode.activeAgents = ['illustrator', 'sound_engineer'];
    }

    episode.status = 'awaiting_user_validation';
    MemoryStore.saveEpisode(episode);

    this.emitStudioEvent({
      type: 'agent_completed_awaiting_validation',
      episodeId: episode.id,
      gateId: episode.currentGate,
      agentId: episode.activeAgent,
      message: `✅ Synchronisation parallèle terminée (Visuels 9:16 + Voix-Off Cache SQLite + Master MP4 à jour) !`,
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
      episode.activeAgents = [];
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
    learnRule: boolean = true,
    targetGateOverride?: ValidationGateId
  ): Promise<Episode> {
    const episode = MemoryStore.getEpisode(episodeId);
    if (!episode) {
      throw new Error(`Épisode introuvable: ${episodeId}`);
    }

    const fbLower = feedbackText.toLowerCase();
    const isVisualOrCardInstruction =
      fbLower.includes('carte') ||
      fbLower.includes('étiquette') ||
      fbLower.includes('etiquette') ||
      fbLower.includes('animation') ||
      fbLower.includes('parallaxe') ||
      fbLower.includes('caméra') ||
      fbLower.includes('camera') ||
      fbLower.includes('image') ||
      fbLower.includes('visuel') ||
      fbLower.includes('transition');

    let targetGate: ValidationGateId =
      targetGateOverride || (episode.currentGate === 'completed' ? '3_script' : episode.currentGate);

    if (!targetGateOverride && isVisualOrCardInstruction && episode.steps.script) {
      if (episode.steps.video && episode.steps.audio) {
        targetGate = '6_video';
      } else if (episode.steps.visuals || episode.steps.prompts) {
        targetGate = '4b_visuals';
      } else {
        targetGate = '4a_prompts';
      }
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

    const activeAgent = targetGate !== 'completed' ? gateToAgent[targetGate] : (episode.activeAgent || 'director');
    if (learnRule && feedbackText.trim().length > 4) {
      MemoryStore.addLearnedRule(activeAgent, feedbackText);
    }

    this.emitStudioEvent({
      type: 'agent_revision_requested',
      episodeId: episode.id,
      gateId: targetGate,
      agentId: activeAgent,
      message: `Retouche demandée à [${activeAgent}] (Porte ${targetGate}) : « ${feedbackText} » (Règle enregistrée en mémoire).`,
      episode
    });

    return this.executeGateStep(episode.id, targetGate, feedbackText);
  }
}

export const Orchestrator = new AlNourOrchestrator();
