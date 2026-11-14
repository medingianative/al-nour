# Studio Vidéo Agentique **Al Nour** (النور)

Studio automatisé et agentique de création de vidéos TikTok 9:16 (40–60 secondes) autour de l'Islam avec douceur et sincérité, ancré dans le quotidien d'une famille vivant dans un **immeuble HLM français** (« Résidence Les Cèdres ») et ouvert sur la diversité des voisins.

---

## Architecture & Points Clés

1. **Bible de la Famille & de l'Immeuble HLM (Sans Clichés)** (`src/bible/series-bible.ts`) :
   - **Tariq** (38 ans, Père, **Ingénieur**) : rasé de près, pull col rond vert olive sobre sur chemise blanche et chino beige.
   - **Amina** (35 ans, Mère, **Infirmière**) : voile terracotta sobre, gilet long crème et tenue civile occidentale classique.
   - **Adam** (10 ans, Fils) & **Lina** (6 ans, Fille).
   - **Ibrahim** (68 ans, Grand-père, **Ancien Avocat**) : rasé de près, cheveux argentés, cardigan en laine sobre sur chemise.
   - **Khadija** (65 ans, Grand-mère) : foulard perle sobre et gilet long lavande doux.
   - **M. Martin** (55 ans, Voisin du 3e étage non-musulman) + **Registre évolutif** permettant d'ajouter à tout moment de nouveaux voisins de toutes cultures et religions dans le bâtiment HLM.
2. **Harnais d'Agents Zéro-Bruit, Autocritique & 6 Portes de Validation** (`src/harness/`) :
   - Chaque agent reçoit uniquement un *Context Packet* JSON isolé (`buildZeroNoiseContext`) contenant le livrable validé de l'étape précédente, les fiches des habitants mobilisés et ses *Règles Apprises* (`learned_rules`).
   - **Autocritique obligatoire** : Chaque agent produit son livrable + un bloc `selfCritique` (`score`, `strengths`, `risksOrDoubts`, `suggestedAlternative`) et **s'arrête** en attendant ta validation sur Telegram ou sur le Studio Virtuel 2D.
3. **Pipeline Multimédia 100% Gratuit (0,00 €)** (`src/media/`) :
   - **Moteur Graphique 2D par Code (`1080x1920`)** : Génère les 8 plans verticaux de l'immeuble HLM (façade, hall des boîtes aux lettres, cuisine, salon, chambre, palier, immersion désert/oasis POV sans Prophète) + support optionnel **Flux.1-Schnell gratuit**.
   - **Dictionnaire Phonétique Islamique + Audio Halal** : Prononciation française naturelle des termes arabes (`Edge-TTS` + mixage ambiance pluie douce / brise).
   - **Montage Vidéo FFmpeg 9:16** : Sous-titres `.ass` par groupes de 4 mots en zone sécurisée TikTok avec surbrillance dorée `#F6C844` et export `.mp4`.

---

## Démarrage Rapide (Local ou VPS Hostinger)

### 1. En direct avec Node.js 24 + FFmpeg
```bash
npm install
npm test     # Génère un premier épisode complet 9:16 (.mp4) + un épisode interactif
npm start    # Lance le Studio Virtuel 2D + le Bot Telegram sur http://localhost:3456
```

### 2. Déploiement sur ton VPS Hostinger avec Docker Compose
```bash
cp .env.example .env
# Renseigne TELEGRAM_BOT_TOKEN dans .env (obtenu via @BotFather sur Telegram)
docker compose up -d --build
```
