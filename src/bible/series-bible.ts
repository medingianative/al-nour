export interface ResidentVisualPalette {
  scale: number;
  skin: string;
  hair: string;
  beard: 'none' | 'short_trimmed' | 'white_trimmed';
  outfitType:
    | 'casual_sweater_shirt'
    | 'modest_cardigan_pants'
    | 'streetwear_hoodie'
    | 'kid_overalls'
    | 'grandpa_cardigan'
    | 'grandma_coat'
    | 'western_blazer_casual';
  top: string;
  top2: string;
  shirt: string;
  pants: string;
  shoes: string;
  headwear: 'modern_fade' | 'hijab_modern' | 'boy_crop' | 'pigtails' | 'silver_swept' | 'hijab_white' | 'side_part_grey';
}

export interface ResidentProfile {
  id: string;
  name: string;
  age: number;
  apartment: string;
  roleInBuilding: string;
  profession: string;
  culturalOrSpiritualBackground: string;
  personalityTraits: string[];
  narrativeHooks: string[];
  outfitDescription: string;
  visual: ResidentVisualPalette;
}

export interface LocationProfile {
  id: 'hlm_ext' | 'hlm_hall' | 'kitchen' | 'living' | 'bedroom' | 'hallway' | 'desert' | 'oasis';
  name: string;
  category: 'hlm_neighborhood' | 'family_apartment' | 'historical_immersion';
  description: string;
  lightingMood: string;
  fluxPromptBackdrop: string;
}

export const ETHICAL_AND_DA_CHARTER = [
  "1. 100% FACELESS (SANS VISAGE) : Aucun personnage ne possède d'yeux, de nez ou de bouche. L'émotion passe par l'inclinaison de la tête, la posture des mains, la lumière et la voix.",
  "2. AUCUN PROPHÈTE NI ANGE REPRÉSENTÉ : Dans les récits prophétiques ou coraniques, aucune silhouette ne représente un Prophète ou un ange (utiliser uniquement une vue subjective POV, une lumière dorée apaisante ou des paysages).",
  "3. ZÉRO CLICHÉ CULTUREL OU VESTIMENTAIRE : La famille vit dans un immeuble HLM français contemporain. Tariq et Ibrahim sont rasés de près (sans barbe ni chéchia). Amina et Khadija portent un voile sobre avec une tenue civile occidentale classique.",
  "4. MÉTIERS ANCRÉS DANS LA PERSONNALITÉ (PAS D'UNIFORME À DOMICILE) : Tariq est ingénieur (esprit structuré, calme, curieux), Amina est infirmière (empathie, écoute, soin des autres), Ibrahim est ancien avocat (éloquence, sens de la justice, précision morale). Leurs tenues restent des vêtements civils simples du quotidien.",
  "5. OUVERTURE SUR LE BÂTIMENT HLM : L'immeuble HLM est un lieu de vie partagé appelé à accueillir des voisins de cultures, parcours et religions différentes dans le respect et la bienveillance."
];

export const DEFAULT_RESIDENTS: ResidentProfile[] = [
  {
    id: 'tariq',
    name: 'Tariq',
    age: 38,
    apartment: 'Appt 3A (3e étage)',
    roleInBuilding: 'Père de famille',
    profession: 'Ingénieur',
    culturalOrSpiritualBackground: 'Musulman pratiquant, approche douce, rationnelle et apaisée',
    personalityTraits: ['Calme', 'Pédagogue', 'Structuré', 'Attentif aux enfants'],
    narrativeHooks: [
      'Utilise des métaphores simples de construction ou d’équilibre pour expliquer la foi et la patience à Adam et Lina',
      'Raconte les histoires des Prophètes le soir avec douceur'
    ],
    outfitDescription: 'Rasé de près, coupe courte moderne, pull col rond vert olive sobre sur chemise blanche et chino beige',
    visual: {
      scale: 1.0,
      skin: '#E2B191',
      hair: '#2D221B',
      beard: 'none',
      outfitType: 'casual_sweater_shirt',
      top: '#4E6741',
      top2: '#3B4F30',
      shirt: '#FAF6F0',
      pants: '#C8B094',
      shoes: '#4A3525',
      headwear: 'modern_fade'
    }
  },
  {
    id: 'amina',
    name: 'Amina',
    age: 35,
    apartment: 'Appt 3A (3e étage)',
    roleInBuilding: 'Mère de famille',
    profession: 'Infirmière hospitalière',
    culturalOrSpiritualBackground: 'Musulmane, spiritualité ancrée dans la miséricorde (Rahma) et le soin des autres',
    personalityTraits: ['Douce', 'Solaire', 'Empathique', 'Observatrice'],
    narrativeHooks: [
      'Fait le lien entre la fragilité humaine qu’elle côtoie à l’hôpital et la gratitude au quotidien',
      'Transmet des rappels sincères en préparant le repas ou en rentrant de garde dans le hall du HLM'
    ],
    outfitDescription: 'Voile sobre terracotta, gilet long beige crème ouvert sur un haut classique sable et pantalon fluide gris-bleu',
    visual: {
      scale: 0.93,
      skin: '#E9BC9E',
      hair: '#2D221B',
      beard: 'none',
      outfitType: 'modest_cardigan_pants',
      top: '#F3EAE0',
      top2: '#C86D51',
      shirt: '#DFCBB8',
      pants: '#5E6E7E',
      shoes: '#9C7A5E',
      headwear: 'hijab_modern'
    }
  },
  {
    id: 'adam',
    name: 'Adam',
    age: 10,
    apartment: 'Appt 3A (3e étage)',
    roleInBuilding: 'Fils aîné',
    profession: 'Écolier (CM2)',
    culturalOrSpiritualBackground: 'Enfant curieux grandissant dans le quartier HLM',
    personalityTraits: ['Curieux', 'Vif', 'Franc', 'Parfois impatient'],
    narrativeHooks: [
      'Pose les questions directes que tout le monde se pose (« Pourquoi Dieu laisse arriver les épreuves ? », « Comment pardonner quand c’est injuste ? »)',
      'Vit des situations concrètes à l’école ou dans la cour du bâtiment HLM'
    ],
    outfitDescription: 'Sweat à capuche bleu nuit, jean et baskets blanches',
    visual: {
      scale: 0.68,
      skin: '#E7B99A',
      hair: '#33251D',
      beard: 'none',
      outfitType: 'streetwear_hoodie',
      top: '#2B3E54',
      top2: '#1E2D3E',
      shirt: '#E5DCCB',
      pants: '#4A6482',
      shoes: '#F4F1EA',
      headwear: 'boy_crop'
    }
  },
  {
    id: 'lina',
    name: 'Lina',
    age: 6,
    apartment: 'Appt 3A (3e étage)',
    roleInBuilding: 'Petite fille',
    profession: 'Écolière (CP)',
    culturalOrSpiritualBackground: 'Enfant spontanée et émerveillée',
    personalityTraits: ['Tendre', 'Spontanée', 'Observatrice', 'Généreuse'],
    narrativeHooks: [
      'Remarque les petits détails du quotidien (un oiseau sur le balcon du HLM, la tristesse d’un voisin)',
      'Rappelle aux adultes la simplicité du cœur'
    ],
    outfitDescription: 'Deux petites nattes, salopette ocre sur marinière crème et baskets',
    visual: {
      scale: 0.56,
      skin: '#EBBFA2',
      hair: '#33251D',
      beard: 'none',
      outfitType: 'kid_overalls',
      top: '#E2A857',
      top2: '#C98E3E',
      shirt: '#FAF4EB',
      pants: '#D49542',
      shoes: '#FAF4EB',
      headwear: 'pigtails'
    }
  },
  {
    id: 'ibrahim',
    name: 'Ibrahim',
    age: 68,
    apartment: 'Appt 2B (2e étage)',
    roleInBuilding: 'Grand-père',
    profession: 'Ancien Avocat à la retraite',
    culturalOrSpiritualBackground: 'Musulman érudit, passionné d’histoire, de droit et de sagesse coranique',
    personalityTraits: ['Éloquent', 'Juste', 'Nuancé', 'Apaisant'],
    narrativeHooks: [
      'Apporte le recul de l’ancien avocat : ne jamais juger sans écouter les deux côtés, défendre la dignité et la justice (Adl)',
      'Raconte les grands récits historiques et coraniques avec une précision captivante'
    ],
    outfitDescription: 'Rasé de près, cheveux argentés coiffés sobrement, cardigan en laine brun-taupe sur chemise blanche et pantalon gris',
    visual: {
      scale: 0.96,
      skin: '#DDA988',
      hair: '#DCD7D0',
      beard: 'none',
      outfitType: 'grandpa_cardigan',
      top: '#6E5D50',
      top2: '#54463B',
      shirt: '#FAF7F2',
      pants: '#4D4843',
      shoes: '#2E2723',
      headwear: 'silver_swept'
    }
  },
  {
    id: 'khadija',
    name: 'Khadija',
    age: 65,
    apartment: 'Appt 2B (2e étage)',
    roleInBuilding: 'Grand-mère',
    profession: 'Ancienne enseignante / Retraitée',
    culturalOrSpiritualBackground: 'Mémoire affective de la famille, douceur et invocations',
    personalityTraits: ['Bienveillante', 'Patiente', 'Chaleureuse', 'Fine psychologue'],
    narrativeHooks: [
      'Apaise les tensions par une parole douce ou un proverbe plein de bon sens',
      'incarne la transmission silencieuse par l’exemple'
    ],
    outfitDescription: 'Foulard blanc perle sobre, gilet long lavande doux sur haut crème',
    visual: {
      scale: 0.89,
      skin: '#E5B698',
      hair: '#E6E2DC',
      beard: 'none',
      outfitType: 'grandma_coat',
      top: '#9B8EA9',
      top2: '#7F728D',
      shirt: '#F6F3EC',
      pants: '#736682',
      shoes: '#4A3F37',
      headwear: 'hijab_white'
    }
  },
  {
    id: 'martin',
    name: 'M. Martin',
    age: 55,
    apartment: 'Appt 3B (3e étage)',
    roleInBuilding: 'Voisin de palier',
    profession: 'Horloger / Artisan de quartier',
    culturalOrSpiritualBackground: 'Voisin non-musulman, humaniste, curieux et attaché au vivre-ensemble dans l’immeuble HLM',
    personalityTraits: ['Respectueux', 'Curieux', 'Amical', 'Discret'],
    narrativeHooks: [
      'Ses discussions dans le hall du HLM ou sur le palier avec Tariq, Amina ou Ibrahim permettent d’expliquer le sens profond d’une valeur islamique (le bon voisinage, l’aumône, la patience) avec naturel et sans prosélytisme lourd'
    ],
    outfitDescription: 'Cheveux poivre et sel avec raie sur le côté, pull col V bordeaux sur chemise bleu ciel et pantalon anthracite',
    visual: {
      scale: 0.98,
      skin: '#F2C9B2',
      hair: '#8C8984',
      beard: 'none',
      outfitType: 'western_blazer_casual',
      top: '#7C2E2B',
      top2: '#5D201E',
      shirt: '#D6E6F2',
      pants: '#4A4E54',
      shoes: '#2C2623',
      headwear: 'side_part_grey'
    }
  }
];

export const DEFAULT_LOCATIONS: LocationProfile[] = [
  {
    id: 'hlm_ext',
    name: 'Façade & Quartier du Bâtiment HLM',
    category: 'hlm_neighborhood',
    description: 'Vue extérieure de la résidence HLM au coucher du soleil : balcons vivants, fenêtres éclairées, arbres au pied du bâtiment et cour partagée.',
    lightingMood: 'Heure dorée (Golden Hour) urbaine et poétique',
    fluxPromptBackdrop: 'Minimalist warm 2D illustration of a modern French HLM apartment building at golden hour, warm lit windows, balconies with plants, trees in courtyard, soft painterly texture, no faces, vertical 9:16'
  },
  {
    id: 'hlm_hall',
    name: 'Hall d’Entrée HLM & Boîtes aux Lettres',
    category: 'hlm_neighborhood',
    description: 'Le hall d’entrée de l’immeuble HLM avec sa batterie de boîtes aux lettres multi-culturelles et sa grande porte vitrée donnant sur les arbres de la cour.',
    lightingMood: 'Lumière du jour douce traversant la baie vitrée du hall',
    fluxPromptBackdrop: 'Warm minimalist 2D illustration of a French apartment building entrance lobby, wall of mailboxes, glass door opening onto green courtyard trees, soft warm light, vertical 9:16'
  },
  {
    id: 'kitchen',
    name: 'Cuisine Familiale Moderne',
    category: 'family_apartment',
    description: 'Cuisine européenne contemporaine de Tariq et Amina : îlot central vert sauge et quartz blanc, crédence sobre, rayon de soleil doré par la fenêtre.',
    lightingMood: 'Fin d’après-midi lumineuse et chaleureuse',
    fluxPromptBackdrop: 'Cozy modern European apartment kitchen, sage green cabinets, rectangular window with warm golden sunbeam, minimalist warm 2D flat illustration, vertical 9:16'
  },
  {
    id: 'living',
    name: 'Salon & Bibliothèque Familiale',
    category: 'family_apartment',
    description: 'Salon chaleureux avec parquet en bois clair, grande bibliothèque (livres d’ingénierie de Tariq et ouvrages de droit/histoire d’Ibrahim) et canapé confortable.',
    lightingMood: 'Lumière ambrée apaisante de fin de journée',
    fluxPromptBackdrop: 'Warm minimalist 2D illustration of a modern French apartment living room, wooden bookshelf filled with books, oak parquet floor, soft warm lighting, vertical 9:16'
  },
  {
    id: 'bedroom',
    name: 'Chambre d’Adam & Lina',
    category: 'family_apartment',
    description: 'Chambre d’enfants cosy avec guirlande lumineuse, étagère de livres et fenêtre donnant sur les lumières du bâtiment HLM d’en face la nuit.',
    lightingMood: 'Ambiance nocturne douce, veilleuse dorée et ciel étoilé',
    fluxPromptBackdrop: 'Cozy children bedroom at night in an apartment building, warm fairy lights, window looking out at city building lights and crescent moon, minimalist 2D illustration, vertical 9:16'
  },
  {
    id: 'hallway',
    name: 'Palier du 3e Étage',
    category: 'hlm_neighborhood',
    description: 'Palier de l’immeuble HLM entre la porte de la famille Al Nour (3A) et celle de M. Martin (3B), éclairé par une applique murale chaleureuse.',
    lightingMood: 'Éclairage intérieur feutré et accueillant',
    fluxPromptBackdrop: 'Warm minimalist 2D illustration of an apartment building hallway landing with two wooden doors, warm wall sconce light, potted plant, vertical 9:16'
  },
  {
    id: 'desert',
    name: 'Immersion Récit — Désert sous les Étoiles (POV)',
    category: 'historical_immersion',
    description: 'Plan d’immersion historique : dunes de sable sous un ciel étoilé profond et halo de lumière dorée céleste (zéro représentation de Prophète).',
    lightingMood: 'Nuit mystique étoilée et halo doré Al Nour',
    fluxPromptBackdrop: 'Poetic minimalist 2D illustration of sweeping desert sand dunes under a starry night sky with a gentle golden light glow on the horizon, no people, no faces, spiritual atmosphere, vertical 9:16'
  },
  {
    id: 'oasis',
    name: 'Immersion Récit — Aube Dorée & Terre Crue (POV)',
    category: 'historical_immersion',
    description: 'Plan d’immersion historique : arches anciennes en terre crue et palmeraie paisible baignées par la lumière de l’aube.',
    lightingMood: 'Aube dorée et rose poudré',
    fluxPromptBackdrop: 'Minimalist warm 2D illustration of ancient earthen arches and palm trees at golden dawn, soft sunbeams, no people, peaceful spiritual atmosphere, vertical 9:16'
  }
];
