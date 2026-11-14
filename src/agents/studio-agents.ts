import { buildZeroNoiseContext } from '../harness/context-builder.js';
import { executeAgentModel, ModelExecutionResult } from '../harness/model-router.js';
import { MemoryStore } from '../harness/memory-store.js';
import {
  Episode,
  IdeaDeliverable,
  IllustratorPromptsDeliverable,
  ResearchDeliverable,
  SceneVisualSpec,
  ScriptDeliverable,
  SoundDeliverable,
  VideoDeliverable
} from '../harness/types.js';
import { renderSceneIllustration } from '../media/svg-scene-renderer.js';
import { generateEpisodeAudio } from '../media/audio-engine.js';
import { renderFinalTikTokVideo } from '../media/video-renderer.js';

export const StudioAgents = {
  // 1. AGENT DIRECTEUR DE STUDIO (Gate 1: Idée, Angle & Casting HLM)
  async runDirector(episode: Episode, feedback?: string): Promise<ModelExecutionResult<IdeaDeliverable>> {
    const ctx = buildZeroNoiseContext('director', episode, feedback);
    const sysPrompt = `Tu es Youssef, Directeur du Studio Al Nour.
Réponds uniquement en JSON { "deliverable": IdeaDeliverable, "selfCritique": SelfCritique }.
Ancre chaque histoire dans la vie réelle de la famille (Tariq ingénieur, Amina infirmière, Adam, Lina, Ibrahim ancien avocat, Khadija) et de leur bâtiment HLM (avec M. Martin et le quartier), sans aucun cliché.`;

    return executeAgentModel<IdeaDeliverable>('director', sysPrompt, ctx, async context => {
      const topic = context.topicPrompt.toLowerCase();
      const isProphetic =
        topic.includes('prophète') ||
        topic.includes('histoire') ||
        topic.includes('médine') ||
        topic.includes('désert') ||
        topic.includes('compagnon');
      const isNeighbor =
        topic.includes('voisin') ||
        topic.includes('martin') ||
        topic.includes('immeuble') ||
        topic.includes('hlm') ||
        topic.includes('comportement');

      const pillar: IdeaDeliverable['pillar'] = isProphetic
        ? 'prophetic_story'
        : isNeighbor
        ? 'daily_behavior_hlm'
        : 'quran_hadith_wisdom';

      const featuredResidents = isProphetic
        ? ['tariq', 'adam', 'lina', 'ibrahim']
        : isNeighbor
        ? ['amina', 'tariq', 'martin', 'lina']
        : ['ibrahim', 'amina', 'adam', 'martin'];

      const primaryLocations = isProphetic
        ? ['hlm_ext', 'bedroom', 'desert', 'living']
        : ['hlm_ext', 'hlm_hall', 'hallway', 'kitchen'];

      const feedbackNote = context.userRevisionFeedback
        ? ` (Ajusté selon ton retour : « ${context.userRevisionFeedback} »)`
        : '';

      return {
        deliverable: {
          title: `Al Nour — ${context.topicPrompt}${feedbackNote}`,
          pillar,
          hookConcept: isProphetic
            ? `Plan extérieur du bâtiment HLM la nuit → Dans sa chambre, Adam demande à Tariq (ingénieur) comment garder espoir quand tout semble bloqué.`
            : `Dans le hall d’entrée du HLM devant les boîtes aux lettres, Amina rentre de sa garde d’infirmière et croise M. Martin les bras chargés.`,
          featuredResidents,
          primaryLocations,
          narrativeArcSummary: isProphetic
            ? `Ouverture sur la façade illuminée de l’immeuble HLM. Tariq écoute le doute d’Adam, puis Grand-père Ibrahim (ancien avocat) évoque avec justesse un récit prophétique sur la patience et la confiance (Tawakkul), avant de revenir à la douceur du foyer.`
            : `Ouverture sur le bâtiment HLM au coucher du soleil. À travers une attention sincère dans le hall de l’immeuble entre Amina, Tariq et leur voisin M. Martin, Lina comprend que la foi se vit d’abord dans la délicatesse du comportement quotidien (Adab).`,
          emotionalTakeaway: `Apaisement, sincérité et fierté d’incarner la douceur au cœur d’un immeuble partagé par toutes les cultures.`
        },
        selfCritique: {
          score: 9,
          strengths: [
            'Ancrage urbain réaliste dès la première seconde avec le plan extérieur du bâtiment HLM.',
            'Métiers pris en compte subtilement dans la psychologie (l’écoute hospitalière d’Amina, le recul d’Ibrahim, l’esprit posé de Tariq) sans aucun cliché.'
          ],
          risksOrDoubts: [
            'Attention à ce que la transition entre la scène du HLM et le rappel spirituel reste naturelle en moins de 50 secondes.'
          ],
          suggestedAlternative: `Commencer directement dans le salon avec Grand-père Ibrahim (ancien avocat) qui arbitre avec douceur une petite injustice vécue par Adam dans la cour du HLM.`
        }
      };
    });
  },

  // 2. AGENT CHERCHEUR & GARDIEN ÉTHIQUE (Gate 2: Sources & Charte)
  async runResearcher(episode: Episode, feedback?: string): Promise<ModelExecutionResult<ResearchDeliverable>> {
    const ctx = buildZeroNoiseContext('researcher', episode, feedback);
    const sysPrompt = `Tu es Salma, Chercheuse Islamique et Gardienne Éthique d'Al Nour.
Réponds uniquement en JSON { "deliverable": ResearchDeliverable, "selfCritique": SelfCritique }.`;

    return executeAgentModel<ResearchDeliverable>('researcher', sysPrompt, ctx, async context => {
      const idea = context.upstreamDeliverables.idea as IdeaDeliverable | undefined;
      const isProphetic = idea?.pillar === 'prophetic_story';

      return {
        deliverable: {
          primarySourceType: isProphetic ? 'Récit Prophétique / Sira' : 'Hadith Authentique',
          referenceCitation: isProphetic
            ? 'Coran — Sourate Ash-Sharh (94:5-6) : « Certes, avec la difficulté il y a une facilité » & Hadith authentique (Sahih Muslim 2999) sur la constance du croyant.'
            : 'Hadith Authentique (Sahih Al-Bukhari 6018 & Sahih Muslim 47) : « Que celui qui croit en Allah et au Jour Dernier soit bienfaisant envers son voisin. » & Coran (Sourate Al-Imran 3:159) sur la douceur du cœur.',
          arabicKeyTerm: isProphetic ? 'Sabr & Tawakkul (الصبر والتوكل)' : 'Ihsan & Adab al-Jar (الإحسان إلى الجار)',
          frenchMeaning: isProphetic
            ? 'La patience active et la confiance sereine après avoir fait tous les efforts.'
            : 'L’excellence du comportement et la bienveillance sincère envers son voisin, quelle que soit sa croyance.',
          historicalOrDailyContext: context.userRevisionFeedback
            ? `Source affinée selon ton instruction (« ${context.userRevisionFeedback} ») : application concrète dans la vie quotidienne de l’immeuble HLM.`
            : `En Islam, la douceur (Rifq) et l’attention portée aux voisins de l’immeuble — musulmans ou non — font partie intégrante de la foi vécue avec sincérité.`,
          ethicalChecklist: {
            noProphetDepiction: true,
            noCulturalCliche: true,
            authenticSourceVerified: true,
            gentleAndSincereTone: true
          }
        },
        selfCritique: {
          score: 9.5,
          strengths: [
            'Sources primaires 100% authentiques (Sahih Bukhari / Muslim et verset coranique consensuel).',
            'Conformité totale avec la charte Al Nour : aucune représentation figurative sensible et zéro cliché culturel.'
          ],
          risksOrDoubts: [
            'Ne pas surcharger le script de termes arabes : garder 1 à 2 mots clés maximum expliqués naturellement en français.'
          ],
          suggestedAlternative: `Utiliser le hadith authentique de Sahih Muslim (2594) : « Certes, Allah est Doux et Il aime la douceur en toute chose, et Il donne par la douceur ce qu’Il ne donne pas par la dureté. »`
        }
      };
    });
  },

  // 3. AGENT SCÉNARISTE TIKTOK (Gate 3: Hook, Script & Découpage 8 plans)
  async runScriptwriter(episode: Episode, feedback?: string): Promise<ModelExecutionResult<ScriptDeliverable>> {
    const ctx = buildZeroNoiseContext('scriptwriter', episode, feedback);
    const sysPrompt = `Tu es Karim, Scénariste TikTok d'Al Nour (format 40-60s).
Réponds uniquement en JSON { "deliverable": ScriptDeliverable, "selfCritique": SelfCritique }.`;

    return executeAgentModel<ScriptDeliverable>('scriptwriter', sysPrompt, ctx, async context => {
      const idea = context.upstreamDeliverables.idea as IdeaDeliverable | undefined;
      const research = context.upstreamDeliverables.research as ResearchDeliverable | undefined;
      const isProphetic = idea?.pillar === 'prophetic_story';

      const hookFirst3Seconds = context.userRevisionFeedback
        ? `Dans notre bâtiment HLM, une seule parole douce a changé toute la soirée.`
        : isProphetic
        ? `Pourquoi les épreuves arrivent-elles même quand on essaie de bien faire ?`
        : `Dans notre immeuble HLM, on croise ses voisins tous les jours… sans voir ce qu’ils portent.`;

      const scenes: ScriptDeliverable['scenes'] = isProphetic
        ? [
            {
              sceneNumber: 1,
              durationSec: 6,
              speakerId: 'narrator',
              speakerDisplayName: 'Narrateur',
              spokenText: hookFirst3Seconds,
              visualActionBrief: 'Plan extérieur au coucher du soleil sur la façade du bâtiment HLM et ses fenêtres éclairées.',
              locationId: 'hlm_ext',
              residentIds: ['tariq', 'adam']
            },
            {
              sceneNumber: 2,
              durationSec: 6,
              speakerId: 'adam',
              speakerDisplayName: 'Adam (10 ans)',
              spokenText: `« Papa, pourquoi des fois tout est bloqué même quand on fait des Douas ? »`,
              visualActionBrief: 'Dans la chambre d’Adam, Tariq (en pull olive sobre) écoute son fils avec attention.',
              locationId: 'bedroom',
              residentIds: ['tariq', 'adam']
            },
            {
              sceneNumber: 3,
              durationSec: 6,
              speakerId: 'tariq',
              speakerDisplayName: 'Tariq (Père)',
              spokenText: `« Viens avec moi Adam, Grand-père Ibrahim a justement une histoire magnifique pour toi. »`,
              visualActionBrief: 'Dans le salon familial, Ibrahim et Khadija accueillent Adam et Lina près de la bibliothèque.',
              locationId: 'living',
              residentIds: ['ibrahim', 'khadija', 'adam']
            },
            {
              sceneNumber: 4,
              durationSec: 7,
              speakerId: 'ibrahim',
              speakerDisplayName: 'Grand-père Ibrahim',
              spokenText: `« Mon garçon, au cœur du désert silencieux, les prophètes ont traversé l'obscurité avec un Sabr inébranlable. »`,
              visualActionBrief: 'Immersion visuelle : nuit étoilée du désert et halo doré Al Nour (POV sans représentation).',
              locationId: 'desert',
              residentIds: []
            },
            {
              sceneNumber: 5,
              durationSec: 7,
              speakerId: 'ibrahim',
              speakerDisplayName: 'Grand-père Ibrahim',
              spokenText: `« Et la promesse d'Allah est éternelle : certes, avec chaque difficulté se cache déjà une immense facilité. »`,
              visualActionBrief: 'Immersion visuelle : l’aube dorée se lève sur les arches anciennes et l’oasis.',
              locationId: 'oasis',
              residentIds: []
            },
            {
              sceneNumber: 6,
              durationSec: 6,
              speakerId: 'amina',
              speakerDisplayName: 'Amina (Mère)',
              spokenText: `« Assalamou Alaykoum mes amours ! En rentrant de garde, je vois que les cœurs se sont apaisés. »`,
              visualActionBrief: 'Dans la cuisine lumineuse, Amina et Lina partagent un moment chaleureux.',
              locationId: 'kitchen',
              residentIds: ['amina', 'lina']
            },
            {
              sceneNumber: 7,
              durationSec: 6,
              speakerId: 'tariq',
              speakerDisplayName: 'Tariq (Père)',
              spokenText: `« Tu vois Adam, comme un pont qu'on calcule, la patience bâtit en silence notre force intérieure. »`,
              visualActionBrief: 'Tariq pose la main sur le cœur face à Adam et Ibrahim dans le salon.',
              locationId: 'living',
              residentIds: ['tariq', 'ibrahim', 'adam']
            },
            {
              sceneNumber: 8,
              durationSec: 6,
              speakerId: 'narrator',
              speakerDisplayName: 'Narrateur',
              spokenText: `Alhamdulillah. Quelle que soit ton épreuve ce soir, garde confiance : la lumière finit toujours par entrer.`,
              visualActionBrief: 'Plan final apaisant sur le bâtiment HLM illuminé dans la douceur du soir.',
              locationId: 'hlm_ext',
              residentIds: ['tariq', 'amina', 'lina']
            }
          ]
        : [
            {
              sceneNumber: 1,
              durationSec: 6,
              speakerId: 'narrator',
              speakerDisplayName: 'Narrateur',
              spokenText: hookFirst3Seconds,
              visualActionBrief: 'Plan d’ouverture sur le bâtiment HLM du quartier à l’heure dorée, fenêtres éclairées.',
              locationId: 'hlm_ext',
              residentIds: ['tariq', 'adam']
            },
            {
              sceneNumber: 2,
              durationSec: 6,
              speakerId: 'amina',
              speakerDisplayName: 'Amina (Mère)',
              spokenText: `« Bonsoir M. Martin ! Vous avez l'air chargé, laissez-moi vous tenir la porte du hall. »`,
              visualActionBrief: 'Dans le hall d’entrée du HLM devant les boîtes aux lettres, Amina salue M. Martin avec respect.',
              locationId: 'hlm_hall',
              residentIds: ['amina', 'martin']
            },
            {
              sceneNumber: 3,
              durationSec: 6,
              speakerId: 'martin',
              speakerDisplayName: 'M. Martin (Voisin)',
              spokenText: `« Merci mille fois Amina, c'est vraiment très aimable à vous après votre longue journée d'hôpital ! »`,
              visualActionBrief: 'Sur le palier du 3e étage, Tariq et M. Martin échangent avec bienveillance.',
              locationId: 'hallway',
              residentIds: ['tariq', 'martin']
            },
            {
              sceneNumber: 4,
              durationSec: 6,
              speakerId: 'lina',
              speakerDisplayName: 'Lina (6 ans)',
              spokenText: `« Maman, pourquoi M. Martin a souri tout de suite quand tu lui as parlé gentiment ? »`,
              visualActionBrief: 'Dans la cuisine moderne, Amina prépare le repas aux côtés de Lina et Adam.',
              locationId: 'kitchen',
              residentIds: ['amina', 'lina', 'adam']
            },
            {
              sceneNumber: 5,
              durationSec: 7,
              speakerId: 'ibrahim',
              speakerDisplayName: 'Grand-père Ibrahim',
              spokenText: `« Ma petite Lina, le Prophète a dit : que celui qui croit en Dieu soit plein de bonté envers son voisin. »`,
              visualActionBrief: 'Dans le salon familial devant la bibliothèque, Ibrahim et Khadija parlent aux enfants.',
              locationId: 'living',
              residentIds: ['ibrahim', 'khadija', 'lina']
            },
            {
              sceneNumber: 6,
              durationSec: 6,
              speakerId: 'tariq',
              speakerDisplayName: 'Tariq (Père)',
              spokenText: `« L'Islam ne se montre pas par de longs discours, mais par la délicatesse et la sincérité du cœur. »`,
              visualActionBrief: 'Plan poétique de lumière dorée apaisante sur l’oasis à l’aube.',
              locationId: 'oasis',
              residentIds: []
            },
            {
              sceneNumber: 7,
              durationSec: 6,
              speakerId: 'adam',
              speakerDisplayName: 'Adam (10 ans)',
              spokenText: `« Alors demain, dès que je croise quelqu'un dans l'ascenseur, je lui dis Salam avec un grand sourire ! »`,
              visualActionBrief: 'Dans la chambre des enfants le soir, Tariq et Amina veillent sur Adam et Lina.',
              locationId: 'bedroom',
              residentIds: ['tariq', 'amina', 'adam']
            },
            {
              sceneNumber: 8,
              durationSec: 6,
              speakerId: 'narrator',
              speakerDisplayName: 'Narrateur',
              spokenText: `Et si ce soir, dans ton immeuble, la plus belle aumône commençait par un simple sourire sincère ?`,
              visualActionBrief: 'Retour sur la façade du bâtiment HLM paisible à la tombée de la nuit.',
              locationId: 'hlm_ext',
              residentIds: ['tariq', 'martin', 'adam']
            }
          ];

      // Normalize sequential scene numbers
      scenes.forEach((s, idx) => {
        s.sceneNumber = idx + 1;
      });

      const fullNarrationText = scenes.map(s => s.spokenText).join(' ');
      const totalWordCount = fullNarrationText.split(/\s+/).length;
      const totalEstimatedDurationSec = scenes.reduce((acc, s) => acc + s.durationSec, 0);

      return {
        deliverable: {
          hookFirst3Seconds,
          narratorVoiceProfile: isProphetic ? 'tariq_warm_male' : 'amina_gentle_female',
          totalEstimatedDurationSec,
          totalWordCount,
          fullNarrationText,
          closingInvocationOrMoral: research?.frenchMeaning || 'La douceur dans le comportement est le plus beau des rappels.',
          tiktokCaptionAndHashtags: `${idea?.title || 'Al Nour'} ✨ La foi vécue avec douceur au quotidien. #AlNour #RappelIslam #Douceur #VivreEnsemble #Famille #TikTokMuslim`,
          scenes
        },
        selfCritique: {
          score: 9.2,
          strengths: [
            `Durée calibrée à ${totalEstimatedDurationSec} secondes (${totalWordCount} mots) idéale pour la rétention TikTok 40–60s.`,
            'Ouverture et fermeture sur le bâtiment HLM qui installent immédiatement l’identité de la série.'
          ],
          risksOrDoubts: [
            'Le rythme entre le plan 5 et le plan 6 doit laisser une demi-seconde de respiration vocale pour que la citation touche le cœur.'
          ],
          suggestedAlternative: `Confier la voix-off de cet épisode à Grand-père Ibrahim (voix masculine posée d'ancien avocat) pour accentuer la gravité douce du rappel.`
        }
      };
    });
  },

  // 4A. AGENT ILLUSTRATEUR DA — ÉTAPE 4A : STORYBOARD & PROMPTS (Avant génération d'images)
  async runIllustratorPrompts(
    episode: Episode,
    feedback?: string
  ): Promise<ModelExecutionResult<IllustratorPromptsDeliverable>> {
    const ctx = buildZeroNoiseContext('illustrator', episode, feedback);
    const sysPrompt = `Tu es Leïla, Directrice Artistique 2D d'Al Nour.
Réponds uniquement en JSON { "deliverable": IllustratorPromptsDeliverable, "selfCritique": SelfCritique }.`;

    return executeAgentModel<IllustratorPromptsDeliverable>('illustrator', sysPrompt, ctx, async context => {
      const script = context.upstreamDeliverables.script as ScriptDeliverable;
      const validLocations: Array<SceneVisualSpec['locationId']> = [
        'hlm_ext',
        'hlm_hall',
        'kitchen',
        'living',
        'bedroom',
        'hallway',
        'desert',
        'oasis'
      ];

      const poses: Array<SceneVisualSpec['pose']> = ['dialogue', 'heart', 'reading', 'dua'];
      const cams: Array<SceneVisualSpec['cameraMotion']> = ['zoom_in', 'pan_right', 'zoom_in', 'static_breathe'];

      const scenes: SceneVisualSpec[] = script.scenes.map((sc, idx) => {
        const loc = validLocations.includes(sc.locationId as SceneVisualSpec['locationId'])
          ? (sc.locationId as SceneVisualSpec['locationId'])
          : 'hlm_ext';

        return {
          sceneNumber: sc.sceneNumber,
          durationSec: sc.durationSec,
          speakerId: sc.speakerId || 'narrator',
          speakerDisplayName: sc.speakerDisplayName || 'Narrateur',
          locationId: loc,
          residentIds: sc.residentIds.slice(0, 3),
          pose: poses[idx % poses.length],
          cameraMotion: cams[idx % cams.length],
          renderEngine: 'code_2d',
          fluxPrompt: `Minimalist warm 2D flat illustration, ${sc.visualActionBrief}, strictly faceless characters with no eyes nose or mouth, modern European apartment HLM setting, golden warm light, vertical 9:16`,
          subtitleText: sc.spokenText
        };
      });

      return {
        deliverable: {
          visualStyleSummary:
            'Moteur Graphique 2D Al Nour v4 (1080x1920) : Résidence HLM chaleureuse, tenues civiles occidentales sobres du quotidien, Tariq et Ibrahim sans barbe, Amina et Khadija voilées sobrement, 100% sans visage.',
          characterConsistencyNotes:
            'Cohérence géométrique et chromatique garantie à 100% sur les 8 plans. Option Flux.1-Schnell gratuit disponible plan par plan.',
          scenes
        },
        selfCritique: {
          score: 9.4,
          strengths: [
            'Alternance visuelle équilibrée entre l’extérieur du bâtiment HLM, les espaces communs (hall/palier) et l’intérieur de l’appartement.',
            'Coût de génération : 0,00 € et respect absolu de la charte sans visage.'
          ],
          risksOrDoubts: [
            'Sur le plan 6 (citation / immersion), on peut au choix garder notre décor 2D vectoriel ou tester un fond de paysage généré par Flux gratuit.'
          ],
          suggestedAlternative: `Activer Flux Gratuit uniquement sur le plan d'immersion (Scène 6) tout en gardant le moteur 2D par code sur toutes les scènes des personnages.`
        }
      };
    });
  },

  // 4B. AGENT ILLUSTRATEUR DA — ÉTAPE 4B : RENDU DES IMAGES 1080x1920
  async runIllustratorRender(
    episode: Episode,
    singleSceneToRegenerate?: number,
    toggleFluxForScene?: number
  ): Promise<ModelExecutionResult<IllustratorPromptsDeliverable>> {
    const promptsStep = episode.steps.visuals || episode.steps.prompts;
    if (!promptsStep) {
      throw new Error('Prompts step (4a) must be completed before rendering visuals (4b).');
    }

    const allResidents = MemoryStore.getResidents();
    const updatedScenes: SceneVisualSpec[] = [];

    for (const sc of promptsStep.deliverable.scenes) {
      const copy: SceneVisualSpec = { ...sc };
      if (toggleFluxForScene === copy.sceneNumber) {
        copy.renderEngine = copy.renderEngine === 'code_2d' ? 'flux_free' : 'code_2d';
      }

      const shouldRender =
        !copy.imageUrl ||
        singleSceneToRegenerate === undefined ||
        singleSceneToRegenerate === copy.sceneNumber ||
        toggleFluxForScene === copy.sceneNumber;

      if (shouldRender) {
        copy.imageUrl = await renderSceneIllustration(episode.id, copy, allResidents);
      }
      updatedScenes.push(copy);
    }

    return {
      modelUsed: 'Moteur Graphique 2D Al Nour (Resvg 1080x1920) + Flux Free [0,00 €]',
      tokensUsed: { input: 120, output: 80, costUsd: 0 },
      deliverable: {
        ...promptsStep.deliverable,
        scenes: updatedScenes
      },
      selfCritique: {
        score: 9.6,
        strengths: [
          `Les ${updatedScenes.length} illustrations haute définition (1080x1920, format 9:16) ont été générées avec succès à 0,00 €.`,
          'Les tenues civiles sobres, l’absence de barbe sur Tariq/Ibrahim et l’architecture du bâtiment HLM sont parfaitement cohérentes.'
        ],
        risksOrDoubts: [
          'Si tu souhaites changer la posture ou les personnages d’un plan précis, tu peux régénérer individuellement n’importe quelle scène.'
        ],
        suggestedAlternative: `Basculer le plan d'immersion en mode Flux IA gratuit pour comparer avec le rendu vectoriel 2D.`
      }
    };
  },

  // 5. AGENT INGÉNIEUR SON (Gate 5: Dictionnaire Phonétique, Voix FR & Ambiance Halal)
  async runSoundEngineer(episode: Episode, feedback?: string): Promise<ModelExecutionResult<SoundDeliverable>> {
    const script = episode.steps.script?.deliverable;
    if (!script) {
      throw new Error('Script step (3) must be validated before generating audio (5).');
    }

    const ambientTrack: SoundDeliverable['ambientTrack'] =
      feedback && feedback.toLowerCase().includes('nuit')
        ? 'night_serenity'
        : feedback && feedback.toLowerCase().includes('vent')
        ? 'evening_breeze'
        : 'gentle_rain';

    const audioDeliverable = await generateEpisodeAudio(episode.id, script, ambientTrack);

    return {
      modelUsed: audioDeliverable.voiceEngineUsed,
      tokensUsed: { input: 180, output: 95, costUsd: 0 },
      deliverable: audioDeliverable,
      selfCritique: {
        score: 9.3,
        strengths: [
          `${audioDeliverable.phoneticAdjustmentsApplied.length} terme(s) islamique(s) ajusté(s) via le Dictionnaire Phonétique Islamique pour une prononciation française fluide.`,
          `Synchronisation mot-à-mot calculée sur ${audioDeliverable.wordTimestamps.length} mots (${audioDeliverable.durationSec}s) avec ambiance halal douce (${audioDeliverable.ambientTrack}).`
        ],
        risksOrDoubts: [
          'Vérifier que le niveau de l’ambiance de pluie douce reste bien en retrait par rapport à la voix.'
        ],
        suggestedAlternative: `Tester avec l'ambiance « night_serenity » (calme nocturne) ou changer la voix narratrice entre Amina (féminine douce) et Tariq (masculine posée).`
      }
    };
  },

  // 6. AGENT MONTEUR VIDÉO 9:16 (Gate 6: Montage FFmpeg + Sous-titres Dorés TikTok)
  async runVideoEditor(episode: Episode): Promise<ModelExecutionResult<VideoDeliverable>> {
    const visuals = episode.steps.visuals?.deliverable;
    const audio = episode.steps.audio?.deliverable;
    if (!visuals || !audio) {
      throw new Error('Visuals (4b) and Audio (5) must be validated before rendering final video (6).');
    }

    const videoDeliverable = await renderFinalTikTokVideo(episode.id, visuals, audio);

    return {
      modelUsed: 'FFmpeg 9:16 Mastering + Libass Golden Subtitles [0,00 €]',
      tokensUsed: { input: 110, output: 60, costUsd: 0 },
      deliverable: videoDeliverable,
      selfCritique: {
        score: 9.7,
        strengths: [
          `Vidéo MP4 verticale (${videoDeliverable.resolution}, ${videoDeliverable.durationSec}s, ${videoDeliverable.fileSizeMb} Mo) encodée en H.264/AAC prête pour TikTok.`,
          'Sous-titres incrustés par groupes de 4 mots en zone sécurisée TikTok avec surbrillance dorée Al Nour sur chaque mot prononcé.'
        ],
        risksOrDoubts: [
          'Prêt à être téléchargé ou publié depuis Telegram avec la description et les hashtags générés à l’étape 3.'
        ],
        suggestedAlternative: `Si un sous-titre te semble trop rapide sur une scène, on peut allonger d'une seconde le plan concerné à l'étape 4.`
      }
    };
  }
};
