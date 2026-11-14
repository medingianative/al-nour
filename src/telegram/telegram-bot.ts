import { Bot, InlineKeyboard, InputFile } from 'grammy';
import path from 'node:path';
import fs from 'node:fs';
import { Orchestrator } from '../harness/orchestrator.js';
import { MemoryStore } from '../harness/memory-store.js';
import { Episode, SelfCritique } from '../harness/types.js';

function formatSelfCritiqueBlock(sc: SelfCritique): string {
  return [
    `\n🔍 *Autocritique de l'agent (${sc.score}/10)* :`,
    `• *Points forts* : ${sc.strengths.join(' | ')}`,
    `• *Point de vigilance* : ${sc.risksOrDoubts.join(' | ')}`,
    `• 💡 *Alternative proposée* : _${sc.suggestedAlternative}_`
  ].join('\n');
}

export function formatTelegramGateMessage(episode: Episode): {
  text: string;
  buttons: Array<Array<{ label: string; action: string }>>;
} {
  const gate = episode.currentGate;

  if (gate === '1_idea' && episode.steps.idea) {
    const { deliverable: d, selfCritique: sc, modelUsed } = episode.steps.idea;
    const text = [
      `🎬 *PORTE 1/6 — Cadrage & Casting HLM (Directeur Studio)*`,
      `🤖 _Modèle : ${modelUsed}_`,
      ``,
      `📌 *Titre* : ${d.title}`,
      `🏢 *Pilier* : \`${d.pillar}\``,
      `🎣 *Hook envisagé* : ${d.hookConcept}`,
      `👥 *Habitants mobilisés* : ${d.featuredResidents.join(', ')}`,
      `🏠 *Décors HLM / Immersion* : ${d.primaryLocations.join(', ')}`,
      `📖 *Arc narratif* : ${d.narrativeArcSummary}`,
      formatSelfCritiqueBlock(sc),
      `\n_Réponds par message pour demander un ajustement, ou clique ci-dessous :_`
    ].join('\n');

    return {
      text,
      buttons: [
        [{ label: '✅ Valider & Passer au Chercheur (Porte 2)', action: `approve:${episode.id}` }],
        [{ label: '💡 Appliquer l’alternative de l’autocritique', action: `alt:${episode.id}` }],
        [{ label: '🔄 Régénérer l’idée', action: `regen:${episode.id}` }]
      ]
    };
  }

  if (gate === '2_research' && episode.steps.research) {
    const { deliverable: d, selfCritique: sc, modelUsed } = episode.steps.research;
    const text = [
      `📚 *PORTE 2/6 — Sources Islamiques & Charte Éthique (Chercheuse)*`,
      `🤖 _Modèle : ${modelUsed}_`,
      ``,
      `📖 *Type de source* : ${d.primarySourceType}`,
      `📜 *Référence exacte* : ${d.referenceCitation}`,
      `✨ *Terme clé* : ${d.arabicKeyTerm} — _${d.frenchMeaning}_`,
      `🏘️ *Application dans l'immeuble HLM* : ${d.historicalOrDailyContext}`,
      `🛡️ *Charte Éthique* : Sans visage ✅ | Zéro Prophète représenté ✅ | Zéro cliché ✅`,
      formatSelfCritiqueBlock(sc)
    ].join('\n');

    return {
      text,
      buttons: [
        [{ label: '✅ Valider & Passer au Scénariste (Porte 3)', action: `approve:${episode.id}` }],
        [{ label: '💡 Appliquer l’alternative de l’autocritique', action: `alt:${episode.id}` }],
        [{ label: '🔄 Régénérer la recherche', action: `regen:${episode.id}` }]
      ]
    };
  }

  if (gate === '3_script' && episode.steps.script) {
    const { deliverable: d, selfCritique: sc, modelUsed } = episode.steps.script;
    const scenesList = d.scenes
      .map(s => `  *${s.sceneNumber}.* [${s.durationSec}s • \`${s.locationId}\`] "${s.spokenText}"`)
      .join('\n');

    const text = [
      `✍️ *PORTE 3/6 — Script TikTok 40–60s & Hooks (Scénariste)*`,
      `🤖 _Modèle : ${modelUsed}_`,
      ``,
      `⚡ *Hook (0–3s)* : « *${d.hookFirst3Seconds}* »`,
      `🎙️ *Voix narratrice* : \`${d.narratorVoiceProfile}\` (${d.totalEstimatedDurationSec}s • ${d.totalWordCount} mots)`,
      ``,
      `🎞️ *Découpage des 8 plans* :\n${scenesList}`,
      formatSelfCritiqueBlock(sc)
    ].join('\n');

    return {
      text,
      buttons: [
        [{ label: '✅ Valider & Préparer le Storyboard 2D (Porte 4a)', action: `approve:${episode.id}` }],
        [{ label: '💡 Appliquer l’alternative de l’autocritique', action: `alt:${episode.id}` }],
        [{ label: '🔄 Réécrire le script', action: `regen:${episode.id}` }]
      ]
    };
  }

  if (gate === '4a_prompts' && episode.steps.prompts) {
    const { deliverable: d, selfCritique: sc, modelUsed } = episode.steps.prompts;
    const summary = d.scenes
      .map(
        s =>
          `  • *Plan ${s.sceneNumber}* (\`${s.locationId}\`) : ${
            s.residentIds.length ? s.residentIds.join(', ') : 'Ambiance POV'
          } — Posture \`${s.pose}\` — Moteur \`${s.renderEngine}\``
      )
      .join('\n');

    const text = [
      `🎨 *PORTE 4a/6 — Validation du Storyboard & Direction Artistique*`,
      `🤖 _Modèle : ${modelUsed}_`,
      ``,
      `🖼️ *Style* : ${d.visualStyleSummary}`,
      `\n📋 *Plans à illustrer* :\n${summary}`,
      formatSelfCritiqueBlock(sc)
    ].join('\n');

    return {
      text,
      buttons: [
        [{ label: '✅ Valider & Générer les 8 Images 9:16 (Porte 4b)', action: `approve:${episode.id}` }],
        [{ label: '💡 Appliquer l’alternative (Flux sur Immersion)', action: `alt:${episode.id}` }]
      ]
    };
  }

  if (gate === '4b_visuals' && episode.steps.visuals) {
    const { deliverable: d, selfCritique: sc, modelUsed } = episode.steps.visuals;
    const text = [
      `🖼️ *PORTE 4b/6 — Album des 8 Illustrations 9:16 Générées (1080x1920)*`,
      `🤖 _Moteur : ${modelUsed}_`,
      ``,
      `Les ${d.scenes.length} scènes de la Famille Al Nour et du bâtiment HLM sont générées !`,
      `Tu peux régénérer un plan précis, basculer un plan en Flux IA gratuit, ou valider pour lancer la voix-off.`,
      formatSelfCritiqueBlock(sc)
    ].join('\n');

    return {
      text,
      buttons: [
        [{ label: '✅ Valider les Images & Générer la Voix-Off (Porte 5)', action: `approve:${episode.id}` }],
        [
          { label: '🔄 Plan 1', action: `scene_regen:${episode.id}:1` },
          { label: '🔄 Plan 2', action: `scene_regen:${episode.id}:2` },
          { label: '🔄 Plan 4', action: `scene_regen:${episode.id}:4` },
          { label: '🎨 Flux Plan 6', action: `scene_flux:${episode.id}:6` }
        ]
      ]
    };
  }

  if (gate === '5_audio' && episode.steps.audio) {
    const { deliverable: d, selfCritique: sc } = episode.steps.audio;
    const phonetics =
      d.phoneticAdjustmentsApplied.length > 0
        ? d.phoneticAdjustmentsApplied.map(p => `${p.original} → _${p.phonetic}_`).join(', ')
        : 'Aucun terme complexe détecté';

    const text = [
      `🎙️ *PORTE 5/6 — Voix-Off Française, Phonétique & Ambiance Halal*`,
      `🔊 *Moteur* : ${d.voiceEngineUsed}`,
      `🗣️ *Voix* : \`${d.voiceId}\` • *Ambiance* : \`${d.ambientTrack}\` (${d.durationSec}s)`,
      `📖 *Dictionnaire Phonétique Islamique appliqué* : ${phonetics}`,
      formatSelfCritiqueBlock(sc)
    ].join('\n');

    return {
      text,
      buttons: [
        [{ label: '✅ Valider l’Audio & Lancer le Montage MP4 9:16 (Porte 6)', action: `approve:${episode.id}` }],
        [{ label: '💡 Changer d’ambiance sonore (Alternative)', action: `alt:${episode.id}` }],
        [{ label: '🔄 Régénérer l’audio', action: `regen:${episode.id}` }]
      ]
    };
  }

  if ((gate === '6_video' || gate === 'completed') && episode.steps.video) {
    const { deliverable: d, selfCritique: sc } = episode.steps.video;
    const caption = episode.steps.script?.deliverable.tiktokCaptionAndHashtags || '';
    const text = [
      `🎬 *PORTE 6/6 — Montage Final TikTok 9:16 Terminé !*`,
      `📐 *Format* : ${d.resolution} • ${d.durationSec}s • ${d.fileSizeMb} Mo`,
      `✨ *Sous-titres* : ${d.subtitleStyle}`,
      `📝 *Description TikTok prête à copier* :\n\`${caption}\``,
      formatSelfCritiqueBlock(sc)
    ].join('\n');

    return {
      text,
      buttons:
        gate === 'completed'
          ? [[{ label: '🎉 Épisode Validé & Terminé', action: `done:${episode.id}` }]]
          : [[{ label: '✅ Approuver le Master Final TikTok', action: `approve:${episode.id}` }]]
    };
  }

  return {
    text: `⏳ Épisode \`${episode.id}\` en cours de traitement sur l'étape \`${gate}\`...`,
    buttons: []
  };
}

export function startTelegramBotIfConfigured(): { active: boolean; botUsername?: string } {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.trim() === '' || token === 'YOUR_TELEGRAM_BOT_TOKEN') {
    return { active: false };
  }

  const bot = new Bot(token);
  let activeChatId: number | null = null;
  let currentEpisodeId: string | null = null;

  async function sendGateUpdateToTelegram(chatId: number, episode: Episode) {
    const formatted = formatTelegramGateMessage(episode);
    const kb = new InlineKeyboard();
    for (const row of formatted.buttons) {
      for (const btn of row) {
        kb.text(btn.label, btn.action);
      }
      kb.row();
    }

    await bot.api.sendMessage(chatId, formatted.text, {
      parse_mode: 'Markdown',
      reply_markup: kb
    });

    // If Gate 6 video is ready, also send the MP4 file directly on Telegram!
    if (episode.currentGate === '6_video' && episode.steps.video?.deliverable.videoFileUrl) {
      const rel = episode.steps.video.deliverable.videoFileUrl.replace(/^\/media\//, '');
      const diskPath = path.resolve(process.cwd(), 'public', 'media', rel);
      if (fs.existsSync(diskPath)) {
        await bot.api.sendVideo(chatId, new InputFile(diskPath), {
          caption: `✨ Master TikTok 9:16 — ${episode.topicPrompt}`
        });
      }
    }
  }

  bot.command('start', async ctx => {
    activeChatId = ctx.chat.id;
    await ctx.reply(
      `🌙 *Salam et bienvenue dans le Studio Agentique Al Nour !*\n\n` +
        `Commandes disponibles :\n` +
        `• \`/new <ton idée de vidéo>\` : Lancer un nouvel épisode (avec validation à chaque porte)\n` +
        `• \`/habitants\` : Voir les habitants du bâtiment HLM\n` +
        `• \`/regles\` : Voir les règles apprises par tes agents\n` +
        `• Envoie simplement un message texte à tout moment pour demander une correction à l'agent actif !`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('habitants', async ctx => {
    const list = MemoryStore.getResidents()
      .map(r => `• *${r.name}* (${r.age}a, ${r.apartment}) — ${r.profession} : _${r.outfitDescription}_`)
      .join('\n');
    await ctx.reply(`🏢 *Habitants du Bâtiment HLM Al Nour* :\n\n${list}`, { parse_mode: 'Markdown' });
  });

  bot.command('voix', async ctx => {
    const { CHARACTER_VOICE_PROFILES } = await import('../media/audio-engine.js');
    const kb = new InlineKeyboard();
    Object.values(CHARACTER_VOICE_PROFILES).forEach((p, i) => {
      kb.text(`🎙️ ${p.displayName}`, `sample_voice:${p.speakerId}`);
      if (i % 2 === 1) kb.row();
    });
    await ctx.reply(
      `🎙️ *Voice Lab — Valide et écoute les voix de chaque personnage :*\n\n` +
      `Clique sur un personnage pour recevoir son extrait audio haute fidélité (avec prononciation arabe naturelle : Bismillah, Alhamdulillah, Salam) :`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  });

  bot.command('regles', async ctx => {
    const rules = MemoryStore.getLearnedRules()
      .slice(0, 10)
      .map(r => `• *[${r.agentId}]* : ${r.ruleText}`)
      .join('\n');
    await ctx.reply(`🧠 *Mémoire & Règles apprises par tes agents* :\n\n${rules}`, { parse_mode: 'Markdown' });
  });

  bot.command('new', async ctx => {
    activeChatId = ctx.chat.id;
    const topic = ctx.match?.trim() || 'La douceur envers son voisin dans le bâtiment HLM';
    await ctx.reply(`🎬 Lancement de l'épisode sur : « *${topic}* »...\nL'Agent Directeur prépare son cadrage et son autocritique.`, {
      parse_mode: 'Markdown'
    });
    const ep = await Orchestrator.createEpisode(topic);
    currentEpisodeId = ep.id;
    await sendGateUpdateToTelegram(ctx.chat.id, ep);
  });

  bot.on('callback_query:data', async ctx => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('sample_voice:')) {
      const speakerId = data.replace('sample_voice:', '') as any;
      await ctx.answerCallbackQuery('Génération de l’échantillon vocal...');
      const { synthesizeSampleVoice, CHARACTER_VOICE_PROFILES } = await import('../media/audio-engine.js');
      const { audioUrl, engine } = await synthesizeSampleVoice(speakerId);
      const diskPath = audioUrl.startsWith('/samples/')
        ? path.resolve(process.cwd(), 'public', audioUrl.replace(/^\//, ''))
        : path.resolve(process.cwd(), 'public', 'media', audioUrl.replace(/^\/media\//, ''));
      const profile = CHARACTER_VOICE_PROFILES[speakerId] || CHARACTER_VOICE_PROFILES.narrator;
      if (fs.existsSync(diskPath) && ctx.chat) {
        await bot.api.sendVoice(ctx.chat.id, new InputFile(diskPath), {
          caption: `🎙️ *Échantillon Vocal — ${profile.displayName}*\n« _${profile.sampleQuote}_ »\n\n*Moteur* : ${engine}\n*Timbre* : ${profile.toneDescription}`,
          parse_mode: 'Markdown'
        });
      }
      return;
    }

    const [action, epId, param] = data.split(':');
    await ctx.answerCallbackQuery('Traitement en cours...');
    if (!epId) return;
    currentEpisodeId = epId;

    if (action === 'approve') {
      const updated = await Orchestrator.approveCurrentGate(epId);
      if (ctx.chat) await sendGateUpdateToTelegram(ctx.chat.id, updated);
    } else if (action === 'regen') {
      const ep = MemoryStore.getEpisode(epId);
      if (ep) {
        const updated = await Orchestrator.executeGateStep(epId, ep.currentGate);
        if (ctx.chat) await sendGateUpdateToTelegram(ctx.chat.id, updated);
      }
    } else if (action === 'alt') {
      const ep = MemoryStore.getEpisode(epId);
      if (ep) {
        const currentStep =
          ep.steps.video ||
          ep.steps.audio ||
          ep.steps.visuals ||
          ep.steps.prompts ||
          ep.steps.script ||
          ep.steps.research ||
          ep.steps.idea;
        const altText = currentStep?.selfCritique.suggestedAlternative || 'Appliquer la variante proposée';
        const updated = await Orchestrator.requestRevision(epId, altText, true);
        if (ctx.chat) await sendGateUpdateToTelegram(ctx.chat.id, updated);
      }
    } else if (action === 'scene_regen') {
      const sceneNum = Number(param || 1);
      const updated = await Orchestrator.executeGateStep(epId, '4b_visuals', undefined, {
        singleSceneToRegenerate: sceneNum
      });
      if (ctx.chat) await sendGateUpdateToTelegram(ctx.chat.id, updated);
    } else if (action === 'scene_flux') {
      const sceneNum = Number(param || 6);
      const updated = await Orchestrator.executeGateStep(epId, '4b_visuals', undefined, {
        toggleFluxForScene: sceneNum
      });
      if (ctx.chat) await sendGateUpdateToTelegram(ctx.chat.id, updated);
    }
  });

  bot.on('message:text', async ctx => {
    if (ctx.message.text.startsWith('/')) return;
    activeChatId = ctx.chat.id;
    const episodes = MemoryStore.listEpisodes();
    const targetId = currentEpisodeId || episodes[0]?.id;

    if (!targetId) {
      const ep = await Orchestrator.createEpisode(ctx.message.text);
      currentEpisodeId = ep.id;
      await sendGateUpdateToTelegram(ctx.chat.id, ep);
      return;
    }

    await ctx.reply(
      `📝 Ton retour est transmis à l'agent actif (et enregistré dans sa mémoire d'apprentissage)...`
    );
    const updated = await Orchestrator.requestRevision(targetId, ctx.message.text, true);
    await sendGateUpdateToTelegram(ctx.chat.id, updated);
  });

  bot.start().catch(err => {
    console.error('Telegram Bot connection warning:', err.message);
  });

  return { active: true };
}
