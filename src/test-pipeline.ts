import { Orchestrator } from './harness/orchestrator.js';
import { MemoryStore } from './harness/memory-store.js';

async function runFullVerification() {
  console.log('🌙 1. Test E2E du Pipeline Al Nour (6 Portes + Autocritique + Rendu 9:16 MP4)...');

  const ep1 = await Orchestrator.createEpisode(
    "En rentrant de sa garde d'infirmière, Amina croise M. Martin dans le hall du bâtiment HLM"
  );
  console.log(`✅ Porte 1 (Directeur) prête — Score autocritique: ${ep1.steps.idea?.selfCritique.score}/10`);

  // Walk through all 6 gates as if user clicked "Valider" on Telegram at each gate
  const afterG1 = await Orchestrator.approveCurrentGate(ep1.id);
  console.log(`✅ Porte 2 (Chercheuse) prête — Source: ${afterG1.steps.research?.deliverable.referenceCitation}`);

  const afterG2 = await Orchestrator.approveCurrentGate(ep1.id);
  console.log(
    `✅ Porte 3 (Scénariste) prête — Hook: "${afterG2.steps.script?.deliverable.hookFirst3Seconds}" (${afterG2.steps.script?.deliverable.totalEstimatedDurationSec}s)`
  );

  const afterG3 = await Orchestrator.approveCurrentGate(ep1.id);
  console.log(`✅ Porte 4a (Storyboard 2D) prête — ${afterG3.steps.prompts?.deliverable.scenes.length} plans configurés`);

  const afterG4a = await Orchestrator.approveCurrentGate(ep1.id);
  console.log(
    `✅ Porte 4b (Illustrations 1080x1920) prête — Exemple image: ${afterG4a.steps.visuals?.deliverable.scenes[0]?.imageUrl}`
  );

  const afterG4b = await Orchestrator.approveCurrentGate(ep1.id);
  console.log(
    `✅ Porte 5 (Ingénieur Son & Phonétique) prête — Audio: ${afterG4b.steps.audio?.deliverable.audioFileUrl}`
  );

  const afterG5 = await Orchestrator.approveCurrentGate(ep1.id);
  console.log(
    `✅ Porte 6 (Montage Final MP4 9:16) prête — Vidéo: ${afterG5.steps.video?.deliverable.videoFileUrl} (${afterG5.steps.video?.deliverable.fileSizeMb} Mo)`
  );

  console.log('🌙 2. Création d’un second épisode en attente à la Porte 1 pour test interactif...');
  const ep2 = await Orchestrator.createEpisode(
    'Dans sa chambre du HLM, Adam demande à son père Tariq et son grand-père Ibrahim comment garder patience face à une épreuve'
  );
  console.log(
    `✅ Épisode interactif ${ep2.id} en pause sur [${ep2.currentGate}] (${ep2.status}) — prêt pour ta validation !`
  );

  console.log(`📊 Total épisodes en base SQLite : ${MemoryStore.listEpisodes().length}`);
}

runFullVerification().catch(err => {
  console.error('❌ Erreur lors du test E2E:', err);
  process.exit(1);
});
