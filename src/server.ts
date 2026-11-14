import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Orchestrator, StudioLiveEvent } from './harness/orchestrator.js';
import { MemoryStore } from './harness/memory-store.js';
import { formatTelegramGateMessage, startTelegramBotIfConfigured } from './telegram/telegram-bot.js';
import { AgentId } from './harness/types.js';
import { ResidentProfile } from './bible/series-bible.js';

const PORT = Number(process.env.PORT || 3456);
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

const sseClients = new Set<http.ServerResponse>();

Orchestrator.on('studio_event', (ev: StudioLiveEvent) => {
  const payload = `data: ${JSON.stringify(ev)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
});

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

const telegramStatus = startTelegramBotIfConfigured();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // 1. SSE Real-Time Event Stream for the 2D Virtual Studio
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write(`data: ${JSON.stringify({ type: 'connected', recentEvents: Orchestrator.getRecentEvents() })}\n\n`);
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    // 2. Get full Studio State (Episodes, Residents, Locations, Agent Models, Learned Rules, Voice Lab)
    if (req.method === 'GET' && url.pathname === '/api/state') {
      const episodes = MemoryStore.listEpisodes();
      const activeEpisode = episodes[0] || null;
      const { CHARACTER_VOICE_PROFILES } = await import('./media/audio-engine.js');
      return sendJson(res, 200, {
        telegramBotActive: telegramStatus.active,
        episodes,
        activeEpisode,
        telegramPreview: activeEpisode ? formatTelegramGateMessage(activeEpisode) : null,
        residents: MemoryStore.getResidents(),
        locations: MemoryStore.getLocations(),
        agentModels: MemoryStore.getAgentModels(),
        learnedRules: MemoryStore.getLearnedRules(),
        voiceProfiles: Object.values(CHARACTER_VOICE_PROFILES),
        recentEvents: Orchestrator.getRecentEvents()
      });
    }

    // 2b. Voice Lab: Audition a voice sample
    if (req.method === 'POST' && url.pathname === '/api/voice-lab/audition') {
      const body = await readJsonBody(req);
      const speakerId = (body.speakerId || 'amina') as any;
      const customText = body.customText ? String(body.customText) : undefined;
      const { synthesizeSampleVoice } = await import('./media/audio-engine.js');
      const { audioUrl, engine } = await synthesizeSampleVoice(speakerId, customText);
      return sendJson(res, 200, { speakerId, audioUrl, engine });
    }

    // 3. Create a New Episode (Starts at Gate 1: Director)
    if (req.method === 'POST' && url.pathname === '/api/episodes') {
      const body = await readJsonBody(req);
      const topicPrompt = String(
        body.topicPrompt || 'La bienveillance envers son voisin dans le bâtiment HLM'
      );
      const episode = await Orchestrator.createEpisode(topicPrompt);
      return sendJson(res, 200, {
        episode,
        telegramPreview: formatTelegramGateMessage(episode)
      });
    }

    // 4. Approve Current Gate -> Move Golden Folder to Next Agent
    if (req.method === 'POST' && url.pathname === '/api/episodes/approve') {
      const body = await readJsonBody(req);
      const episodeId = String(body.episodeId || '');
      const episode = await Orchestrator.approveCurrentGate(episodeId);
      return sendJson(res, 200, {
        episode,
        telegramPreview: formatTelegramGateMessage(episode)
      });
    }

    // 5. Request Revision / Apply Self-Critique Alternative / Teach Rule
    if (req.method === 'POST' && url.pathname === '/api/episodes/revise') {
      const body = await readJsonBody(req);
      const episodeId = String(body.episodeId || '');
      const feedbackText = String(body.feedbackText || '');
      const episode = await Orchestrator.requestRevision(episodeId, feedbackText, true);
      return sendJson(res, 200, {
        episode,
        telegramPreview: formatTelegramGateMessage(episode),
        learnedRules: MemoryStore.getLearnedRules()
      });
    }

    // 6. Regenerate Single Scene or Toggle Flux on a Scene (Gate 4b)
    if (req.method === 'POST' && url.pathname === '/api/episodes/scene-action') {
      const body = await readJsonBody(req);
      const episodeId = String(body.episodeId || '');
      const sceneNumber = Number(body.sceneNumber || 1);
      const mode = String(body.mode || 'regen');
      const episode = await Orchestrator.executeGateStep(
        episodeId,
        '4b_visuals',
        undefined,
        mode === 'flux'
          ? { toggleFluxForScene: sceneNumber }
          : { singleSceneToRegenerate: sceneNumber }
      );
      return sendJson(res, 200, {
        episode,
        telegramPreview: formatTelegramGateMessage(episode)
      });
    }

    // 7. Add a New Neighbor / Resident to the HLM Building
    if (req.method === 'POST' && url.pathname === '/api/residents') {
      const body = await readJsonBody(req);
      const name = String(body.name || 'Nouveau Voisin').trim();
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36).slice(-3);
      const newResident: ResidentProfile = {
        id,
        name,
        age: Number(body.age || 40),
        apartment: String(body.apartment || 'Appt 4B (4e étage)'),
        roleInBuilding: String(body.roleInBuilding || 'Voisin du bâtiment HLM'),
        profession: String(body.profession || 'Enseignant'),
        culturalOrSpiritualBackground: String(
          body.culturalOrSpiritualBackground || 'Culture & parcours variés dans l’immeuble HLM'
        ),
        personalityTraits: String(body.personalityTraits || 'Bienveillant, Curieux, Chaleureux')
          .split(',')
          .map(s => s.trim()),
        narrativeHooks: [String(body.narrativeHook || 'Échanges quotidiens dans le hall du bâtiment HLM')],
        outfitDescription: String(body.outfitDescription || 'Tenue civile occidentale sobre du quotidien'),
        visual: {
          scale: 0.96,
          skin: String(body.skin || '#E5B89B'),
          hair: String(body.hair || '#2D221B'),
          beard: 'none',
          outfitType: (body.outfitType as ResidentProfile['visual']['outfitType']) || 'casual_sweater_shirt',
          top: String(body.topColor || '#3B5978'),
          top2: '#2B4259',
          shirt: '#FAF6F0',
          pants: '#4A4E54',
          shoes: '#2C2623',
          headwear: (body.headwear as ResidentProfile['visual']['headwear']) || 'modern_fade'
        }
      };
      MemoryStore.saveResident(newResident);
      return sendJson(res, 200, { residents: MemoryStore.getResidents() });
    }

    // 8. Update Per-Agent Model Configuration
    if (req.method === 'POST' && url.pathname === '/api/models') {
      const body = await readJsonBody(req);
      const agentId = String(body.agentId) as AgentId;
      const updated = MemoryStore.updateAgentModel(agentId, {
        provider: body.provider as 'openrouter_free' | 'groq_free' | 'custom_openai' | 'free_autonomous',
        modelId: String(body.modelId || ''),
        temperature: Number(body.temperature ?? 0.4)
      });
      return sendJson(res, 200, { updated, agentModels: MemoryStore.getAgentModels() });
    }

    // 9. Serve Static Files (public/index.html & public/media/*)
    let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.png': 'image/png',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.ass': 'text/plain; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8'
      };
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✨ Studio Virtuel Al Nour actif sur http://localhost:${PORT}`);
});
