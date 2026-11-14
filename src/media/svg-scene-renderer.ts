import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { ResidentProfile } from '../bible/series-bible.js';
import { EducationalOverlay, ResearchDeliverable, SceneVisualSpec } from '../harness/types.js';

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'media');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTextLines(text: string, maxCharsPerLine: number, maxLines: number = 3): string[] {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');
  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
      if (lines.length >= maxLines - 1) {
        break;
      }
    }
  }
  const consumedWords = lines.join(' ').split(' ').filter(Boolean).length;
  const remaining = words.slice(consumedWords).join(' ');
  if (remaining) {
    lines.push(
      remaining.length > maxCharsPerLine + 6
        ? `${remaining.slice(0, maxCharsPerLine + 3).trim()}...`
        : remaining
    );
  }
  return lines.slice(0, maxLines);
}

/**
 * Automatically derives a rich Educational Overlay for any scene if not explicitly set
 */
export function resolveSceneEducationalOverlay(
  scene: SceneVisualSpec,
  research?: ResearchDeliverable,
  episodeTitle?: string
): EducationalOverlay {
  if (scene.educationalOverlay) {
    return scene.educationalOverlay;
  }

  const citation =
    research?.referenceCitation ||
    'Sahih Al-Bukhari 6018 & Muslim 47 — La bienveillance envers le voisin';
  const arabicTerm = research?.arabicKeyTerm || 'Al-Ihsan & Al-Jiwar (الإحسان والجار)';
  const frenchMeaning =
    research?.frenchMeaning ||
    'Excellence du comportement, douceur sincère et respect attentif envers ses voisins.';

  if (scene.sceneNumber === 1) {
    return {
      type: 'context_badge',
      badgeTitle: '✦ ÉPISODE ÉDUCATIF AL NOUR • RÉSIDENCE LES CÈDRES ✦',
      arabicScript: 'النُّورُ فِي الْأَخْلَاقِ',
      phonetic: 'Al-Nour fi Al-Akhlaq (La lumière par le comportement)',
      mainText: episodeTitle || 'Vivre sa foi avec douceur, sincérité et respect au quotidien',
      sourceOrSubtext: `Thème : ${arabicTerm}`
    };
  }

  if (scene.sceneNumber === 2 || scene.sceneNumber === 3) {
    const hasSalam = scene.subtitleText.toLowerCase().includes('salam') || scene.subtitleText.toLowerCase().includes('bonsoir');
    return {
      type: 'arabic_term_dua',
      badgeTitle: hasSalam
        ? '✦ SALUTATION & BIENVEILLANCE PROPHÉTIQUE ✦'
        : '✦ NOTION CLÉ & INVOCATION (DU’A) ✦',
      arabicScript: hasSalam ? 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ' : 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
      phonetic: hasSalam ? "Assalâmou 'Alaykoum wa Rahmatoullâh" : 'Bismillâhi Ar-Rahmâni Ar-Rahîm',
      mainText: hasSalam
        ? 'Saluer son voisin avec le sourire et lui faciliter sa journée est une œuvre de foi.'
        : frenchMeaning,
      sourceOrSubtext: `Terme étudié : ${arabicTerm}`
    };
  }

  if (scene.sceneNumber === 4) {
    return {
      type: 'arabic_term_dua',
      badgeTitle: '✦ QUESTION D’ENFANT • TRANSMISSION FAMILIALE ✦',
      arabicScript: 'الرِّفْقُ مَا كَانَ فِي شَيْءٍ إِلَّا زَانَهُ',
      phonetic: 'Ar-Rifq (La douceur embellit toute chose)',
      mainText: frenchMeaning,
      sourceOrSubtext: 'Pédagogie par l’exemple au sein de la famille Al Nour'
    };
  }

  if (scene.sceneNumber === 5 || scene.sceneNumber === 6) {
    return {
      type: 'hadith_quran_card',
      badgeTitle: `✦ SOURCE AUTHENTIQUE • ${(research?.primarySourceType || 'HADITH & CORAN').toUpperCase()} ✦`,
      arabicScript: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيُحْسِنْ إِلَى جَارِهِ',
      phonetic: "Man kâna yu'minu billâhi... falyuhsin ilâ jârihi",
      mainText: frenchMeaning,
      sourceOrSubtext: `Réf : ${citation}`
    };
  }

  return {
    type: 'action_tip',
    badgeTitle: '✦ LE GESTE AL NOUR À RETENIR AU QUOTIDIEN ✦',
    arabicScript: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ',
    phonetic: 'Tabassoumouka fî wajhi akhîka sadaqah',
    mainText: '« Ton sourire face à ton prochain est une aumône (Sadaqa). » Un geste simple apaise tout un immeuble.',
    sourceOrSubtext: `Réf : ${citation}`
  };
}

function buildCharacterSvgGroup(
  char: ResidentProfile,
  cx: number,
  baseY: number,
  idx: number,
  poseMode: SceneVisualSpec['pose'],
  isActiveSpeaker: boolean
): string {
  const v = char.visual;
  const s = v.scale * 3.15; // Scale for 1080x1920 2.5D canvas
  const headTiltDeg = isActiveSpeaker ? 2.2 : idx > 0 ? -2.0 : 1.2;
  const torsoTopY = -152;
  const hipY = -64;
  const legTopY = -68;
  const shoeY = -6;

  // 3D Rim Light & Speaking Aura when character is talking
  const speakingHaloSvg = isActiveSpeaker
    ? `
      <ellipse cx="0" cy="${torsoTopY + 10}" rx="62" ry="88" fill="url(#speakerAuraGrad)" />
      <circle cx="0" cy="${torsoTopY - 34}" r="38" fill="none" stroke="rgba(244,196,78,0.55)" stroke-width="2" stroke-dasharray="5,4" />
      <circle cx="0" cy="${torsoTopY - 34}" r="47" fill="none" stroke="rgba(244,196,78,0.28)" stroke-width="1.5" />
    `
    : '';

  let outfitSvg = '';
  if (v.outfitType === 'casual_sweater_shirt') {
    outfitSvg = `
      <rect x="-33" y="${torsoTopY + 8}" width="66" height="${hipY - (torsoTopY + 8)}" rx="14" fill="${v.top}" />
      <rect x="-33" y="${torsoTopY + 8}" width="22" height="${hipY - (torsoTopY + 8)}" rx="14" fill="rgba(255,255,255,0.09)" />
      <rect x="14" y="${torsoTopY + 8}" width="19" height="${hipY - (torsoTopY + 8)}" rx="10" fill="rgba(0,0,0,0.14)" />
      <polygon points="-12,${torsoTopY + 6} -5,${torsoTopY + 18} 0,${torsoTopY + 11} 5,${torsoTopY + 18} 12,${torsoTopY + 6}" fill="${v.shirt}" />
    `;
  } else if (v.outfitType === 'modest_cardigan_pants') {
    outfitSvg = `
      <rect x="-30" y="${torsoTopY + 8}" width="60" height="${hipY - (torsoTopY + 8)}" rx="12" fill="${v.shirt}" />
      <rect x="-34" y="${torsoTopY + 8}" width="21" height="94" rx="9" fill="${v.top}" />
      <rect x="-34" y="${torsoTopY + 8}" width="8" height="94" rx="4" fill="rgba(255,255,255,0.12)" />
      <rect x="13" y="${torsoTopY + 8}" width="21" height="94" rx="9" fill="${v.top}" />
      <rect x="25" y="${torsoTopY + 8}" width="9" height="94" rx="4" fill="rgba(0,0,0,0.15)" />
      <path d="M -21 ${torsoTopY + 8} A 21 11 0 0 0 21 ${torsoTopY + 8} Z" fill="${v.top2}" />
    `;
  } else if (v.outfitType === 'grandpa_cardigan') {
    outfitSvg = `
      <rect x="-32" y="${torsoTopY + 8}" width="64" height="${hipY - (torsoTopY + 8)}" rx="12" fill="${v.shirt}" />
      <polygon points="-33,${torsoTopY + 10} -11,${torsoTopY + 8} 0,${torsoTopY + 34} 11,${torsoTopY + 8} 33,${torsoTopY + 10} 33,${hipY} -33,${hipY}" fill="${v.top}" />
      <line x1="0" y1="${torsoTopY + 34}" x2="0" y2="${hipY}" stroke="rgba(0,0,0,0.22)" stroke-width="2" />
    `;
  } else if (v.outfitType === 'western_blazer_casual') {
    outfitSvg = `
      <rect x="-32" y="${torsoTopY + 8}" width="64" height="${hipY - (torsoTopY + 8)}" rx="10" fill="${v.shirt}" />
      <rect x="-33" y="${torsoTopY + 8}" width="66" height="${hipY - (torsoTopY + 8)}" rx="13" fill="${v.top}" />
      <polygon points="-12,${torsoTopY + 6} 0,${torsoTopY + 24} 12,${torsoTopY + 6}" fill="${v.shirt}" />
      <rect x="-33" y="${torsoTopY + 8}" width="18" height="${hipY - (torsoTopY + 8)}" rx="9" fill="rgba(255,255,255,0.08)" />
    `;
  } else if (v.outfitType === 'streetwear_hoodie') {
    outfitSvg = `
      <ellipse cx="0" cy="${torsoTopY + 8}" rx="28" ry="12" fill="${v.top2}" />
      <rect x="-33" y="${torsoTopY + 8}" width="66" height="${hipY - (torsoTopY + 6)}" rx="14" fill="${v.top}" />
      <rect x="-18" y="${torsoTopY + 46}" width="36" height="22" rx="6" fill="rgba(0,0,0,0.12)" />
    `;
  } else if (v.outfitType === 'kid_overalls') {
    outfitSvg = `
      <rect x="-30" y="${torsoTopY + 10}" width="60" height="${hipY - (torsoTopY + 10)}" rx="12" fill="${v.shirt}" />
      <rect x="-19" y="${torsoTopY + 30}" width="38" height="${hipY - (torsoTopY + 26)}" rx="6" fill="${v.top}" />
      <rect x="-20" y="${torsoTopY + 10}" width="8" height="25" fill="${v.top}" />
      <rect x="12" y="${torsoTopY + 10}" width="8" height="25" fill="${v.top}" />
      <circle cx="-16" cy="${torsoTopY + 33}" r="2.5" fill="#F4C44E" />
      <circle cx="16" cy="${torsoTopY + 33}" r="2.5" fill="#F4C44E" />
    `;
  } else {
    outfitSvg = `
      <rect x="-33" y="${torsoTopY + 8}" width="66" height="94" rx="14" fill="${v.top}" />
      <path d="M -22 ${torsoTopY + 10} A 22 12 0 0 0 22 ${torsoTopY + 10} Z" fill="${v.shirt}" />
    `;
  }

  const sleeveColor = v.outfitType === 'kid_overalls' ? v.shirt : v.top;
  let rHandX = 36;
  let rHandY = torsoTopY + 82;
  let rArmPath = `M 33 ${torsoTopY + 20} Q 44 ${torsoTopY + 56} ${rHandX} ${rHandY}`;
  let lArmPath = `M -33 ${torsoTopY + 20} Q -44 ${torsoTopY + 56} -36 ${torsoTopY + 82}`;
  let lHandX = -36;
  let lHandY = torsoTopY + 82;

  if (poseMode === 'dua') {
    rHandX = 15;
    rHandY = torsoTopY + 36;
    lHandX = -15;
    lHandY = torsoTopY + 36;
    rArmPath = `M 33 ${torsoTopY + 20} Q 44 ${torsoTopY + 58} ${rHandX} ${rHandY}`;
    lArmPath = `M -33 ${torsoTopY + 20} Q -44 ${torsoTopY + 58} ${lHandX} ${lHandY}`;
  } else if (poseMode === 'heart' && isActiveSpeaker) {
    lHandX = -6;
    lHandY = torsoTopY + 44;
    lArmPath = `M -33 ${torsoTopY + 20} Q -40 ${torsoTopY + 58} ${lHandX} ${lHandY}`;
  } else if (poseMode === 'dialogue' && isActiveSpeaker) {
    rHandX = 44;
    rHandY = torsoTopY + 48;
    rArmPath = `M 33 ${torsoTopY + 20} Q 48 ${torsoTopY + 64} ${rHandX} ${rHandY}`;
  } else if (poseMode === 'reading' && isActiveSpeaker) {
    rHandX = 16;
    rHandY = torsoTopY + 58;
    rArmPath = `M 33 ${torsoTopY + 20} Q 42 ${torsoTopY + 66} ${rHandX} ${rHandY}`;
  }

  let headwearSvg = '';
  if (v.headwear === 'pigtails') {
    headwearSvg += `
      <ellipse cx="-26" cy="6" rx="8" ry="14" transform="rotate(20 -26 6)" fill="${v.hair}" />
      <ellipse cx="26" cy="6" rx="8" ry="14" transform="rotate(-20 26 6)" fill="${v.hair}" />
      <circle cx="-22" cy="-2" r="3.5" fill="#E2A857" />
      <circle cx="22" cy="-2" r="3.5" fill="#E2A857" />
    `;
  }
  if (v.headwear === 'hijab_modern' || v.headwear === 'hijab_white') {
    const hColor = v.headwear === 'hijab_modern' ? '#C86D51' : '#F6F3EC';
    headwearSvg += `
      <ellipse cx="0" cy="0" rx="28" ry="33" fill="${hColor}" />
      <path d="M -26 10 Q 0 36 26 10 L 22 28 Q 0 42 -22 28 Z" fill="${hColor}" opacity="0.92" />
    `;
  }

  let topHairSvg = '';
  if (
    v.headwear === 'modern_fade' ||
    v.headwear === 'silver_swept' ||
    v.headwear === 'side_part_grey' ||
    v.headwear === 'boy_crop' ||
    v.headwear === 'pigtails'
  ) {
    topHairSvg = `<path d="M -22 -6 A 23 23 0 0 1 22 -6 Q 0 -14 -22 -6 Z" fill="${v.hair}" />`;
  }

  return `
    <g transform="translate(${cx}, ${baseY}) scale(${s})" filter="url(#dropShadow3D)">
      ${speakingHaloSvg}
      <!-- Multi-layered 3D ground contact shadow -->
      <ellipse cx="0" cy="2" rx="48" ry="12" fill="rgba(12,8,5,0.38)" />
      <ellipse cx="0" cy="0" rx="34" ry="7" fill="rgba(12,8,5,0.52)" />
      <rect x="-25" y="${legTopY}" width="21" height="62" rx="6" fill="${v.pants}" />
      <rect x="4" y="${legTopY}" width="21" height="62" rx="6" fill="${v.pants}" />
      <rect x="16" y="${legTopY}" width="9" height="62" rx="4" fill="rgba(0,0,0,0.18)" />
      <rect x="-28" y="${shoeY - 8}" width="25" height="11" rx="4" fill="${v.shoes}" />
      <rect x="3" y="${shoeY - 8}" width="25" height="11" rx="4" fill="${v.shoes}" />
      ${outfitSvg}
      <path d="${lArmPath}" stroke="${sleeveColor}" stroke-width="15" stroke-linecap="round" fill="none" />
      <path d="${rArmPath}" stroke="${sleeveColor}" stroke-width="15" stroke-linecap="round" fill="none" />
      <circle cx="${lHandX}" cy="${lHandY}" r="7.5" fill="${v.skin}" />
      <circle cx="${rHandX}" cy="${rHandY}" r="7.5" fill="${v.skin}" />
      <rect x="-9" y="${torsoTopY - 10}" width="18" height="20" rx="7" fill="${v.skin}" />
      <!-- Subtle neck shadow for 3D depth -->
      <ellipse cx="0" cy="${torsoTopY - 4}" rx="9" ry="4" fill="rgba(0,0,0,0.16)" />
      <g transform="translate(0, ${torsoTopY - 34}) rotate(${headTiltDeg})">
        ${headwearSvg}
        <!-- Faceless 3D Shaded Head -->
        <ellipse cx="0" cy="0" rx="22" ry="28" fill="${v.skin}" />
        <path d="M 6 -26 A 20 27 0 0 1 6 26 A 14 26 0 0 0 6 -26 Z" fill="rgba(0,0,0,0.10)" />
        <path d="M -10 -24 A 18 25 0 0 0 -10 22 A 14 24 0 0 1 -10 -24 Z" fill="rgba(255,255,255,0.12)" />
        ${topHairSvg}
      </g>
    </g>
  `;
}

function buildRoomBackgroundSvg(locationId: SceneVisualSpec['locationId']): string {
  if (locationId === 'hlm_ext') {
    let windowsSvg = '';
    for (let row = 0; row < 5; row++) {
      const wy = 420 + row * 170;
      for (let col = 0; col < 3; col++) {
        const wx = 270 + col * 195;
        const isLit = (row + col) % 2 === 0 || (row === 2 && col === 1);
        windowsSvg += `
          <!-- 3D Window Recess -->
          <rect x="${wx - 6}" y="${wy - 6}" width="144" height="130" rx="4" fill="#5A524A" />
          <rect x="${wx}" y="${wy}" width="132" height="118" fill="${isLit ? '#FFE299' : '#3B4B5E'}" stroke="#8C8277" stroke-width="5" />
          ${isLit ? `<rect x="${wx}" y="${wy}" width="132" height="118" fill="url(#windowGlow)" />` : ''}
          <line x1="${wx + 66}" y1="${wy}" x2="${wx + 66}" y2="${wy + 118}" stroke="#8C8277" stroke-width="4" />
          <!-- 3D Balcony with drop shadow -->
          <rect x="${wx - 14}" y="${wy + 100}" width="160" height="28" rx="3" fill="#7C746B" />
          <rect x="${wx - 14}" y="${wy + 124}" width="160" height="8" fill="rgba(0,0,0,0.28)" />
        `;
      }
    }
    return `
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1E2F48" />
          <stop offset="38%" stop-color="#534B68" />
          <stop offset="72%" stop-color="#C87D55" />
          <stop offset="100%" stop-color="#F2C785" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#skyGrad)" />
      <!-- Distant 3D City Silhouettes (Parallax Layer 1) -->
      <rect x="40" y="520" width="180" height="820" fill="rgba(32,36,54,0.55)" />
      <rect x="870" y="560" width="175" height="780" fill="rgba(32,36,54,0.55)" />
      <!-- Main HLM Building with 3D side wing depth (Parallax Layer 2) -->
      <polygon points="140,380 185,350 185,1340 140,1340" fill="#B8AEA0" />
      <rect x="185" y="350" width="710" height="990" fill="#E6DDD0" filter="url(#dropShadow3D)" />
      <rect x="185" y="350" width="52" height="990" fill="#C86D51" />
      <rect x="843" y="350" width="52" height="990" fill="#A9563C" />
      <rect x="165" y="328" width="750" height="26" rx="4" fill="#6A625B" />
      ${windowsSvg}
      <rect x="410" y="1185" width="260" height="155" rx="6" fill="#2B3A4A" />
      <rect x="430" y="1202" width="220" height="138" fill="#FFE299" opacity="0.82" />
      <!-- 3D Trees & Street Lamps -->
      <ellipse cx="155" cy="1275" rx="130" ry="115" fill="#3B5434" filter="url(#dropShadow3D)" />
      <ellipse cx="135" cy="1255" rx="95" ry="85" fill="#4E6E45" />
      <ellipse cx="945" cy="1265" rx="140" ry="120" fill="#3B5434" filter="url(#dropShadow3D)" />
      <ellipse cx="920" cy="1245" rx="100" ry="90" fill="#4E6E45" />
      <!-- 3D Perspective Courtyard Floor -->
      <rect x="0" y="1335" width="1080" height="585" fill="url(#floorGradExt)" />
      <polygon points="410,1335 670,1335 880,1920 200,1920" fill="rgba(255,226,153,0.16)" />
    `;
  }

  if (locationId === 'hlm_hall') {
    let boxesSvg = '';
    for (let mr = 0; mr < 4; mr++) {
      for (let mc = 0; mc < 3; mc++) {
        const mx = 96 + mc * 138;
        const my = 520 + mr * 120;
        boxesSvg += `
          <rect x="${mx}" y="${my}" width="124" height="106" rx="4" fill="#B89B72" stroke="#7A6344" stroke-width="4" />
          <rect x="${mx + 22}" y="${my + 22}" width="78" height="16" rx="2" fill="#FAF6F0" />
          <rect x="${mx + 18}" y="${my + 56}" width="88" height="8" rx="2" fill="#4A3C2A" />
        `;
      }
    }
    return `
      <defs>
        <linearGradient id="hallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#EAE3DA" />
          <stop offset="72%" stop-color="#D2C7B8" />
          <stop offset="100%" stop-color="#9A8E80" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#hallGrad)" />
      <!-- 3D Glass Entrance Door with Volumetric Sunlight -->
      <rect x="630" y="390" width="370" height="960" rx="6" fill="#89B8CC" stroke="#3F4A54" stroke-width="16" filter="url(#dropShadow3D)" />
      <circle cx="810" cy="860" r="140" fill="#58784E" opacity="0.85" />
      <polygon points="630,410 990,410 1080,1750 380,1750" fill="url(#sunbeam3D)" />
      <!-- 3D Mailbox Bank with Side Depth -->
      <polygon points="56,495 76,475 76,1025 56,1045" fill="#634F35" />
      <rect x="76" y="490" width="445" height="535" rx="8" fill="#A3865E" stroke="#7A6344" stroke-width="8" filter="url(#dropShadow3D)" />
      ${boxesSvg}
      <!-- 3D Tiled Floor with Perspective Lines -->
      <rect x="0" y="1350" width="1080" height="570" fill="#9E9488" />
      <rect x="0" y="1340" width="1080" height="16" fill="#6E655C" />
    `;
  }

  if (locationId === 'kitchen') {
    return `
      <defs>
        <linearGradient id="kitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F5EFE6" />
          <stop offset="70%" stop-color="#E5DACB" />
          <stop offset="100%" stop-color="#C8B59E" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#kitGrad)" />
      <!-- 3D Kitchen Window with Volumetric Morning Light -->
      <rect x="665" y="420" width="320" height="440" rx="8" fill="#FFFDF7" stroke="#5C5349" stroke-width="14" filter="url(#dropShadow3D)" />
      <line x1="825" y1="420" x2="825" y2="860" stroke="#5C5349" stroke-width="10" />
      <line x1="665" y1="640" x2="985" y2="640" stroke="#5C5349" stroke-width="10" />
      <!-- Wooden Shelf & Plant with 3D Shadow -->
      <rect x="84" y="610" width="435" height="24" rx="4" fill="#B8895E" filter="url(#dropShadow3D)" />
      <circle cx="405" cy="550" r="44" fill="#4E6741" />
      <rect x="378" y="565" width="54" height="45" rx="6" fill="#C86D51" />
      <polygon points="665,430 985,430 720,1780 120,1780" fill="url(#sunbeam3D)" />
      <rect x="0" y="1345" width="1080" height="575" fill="#68786B" />
      <rect x="0" y="1312" width="1080" height="36" fill="#EFECE6" />
    `;
  }

  if (locationId === 'bedroom') {
    return `
      <defs>
        <linearGradient id="bedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1B273D" />
          <stop offset="65%" stop-color="#2B3B57" />
          <stop offset="100%" stop-color="#483A36" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#bedGrad)" />
      <!-- Night Window overlooking HLM buildings & Crescent Moon -->
      <rect x="615" y="430" width="354" height="450" rx="8" fill="#101829" stroke="#EAE2D7" stroke-width="14" filter="url(#dropShadow3D)" />
      <rect x="660" y="585" width="165" height="295" fill="#223047" />
      <rect x="690" y="625" width="34" height="34" fill="#FFE299" />
      <rect x="756" y="690" width="34" height="34" fill="#FFE299" />
      <circle cx="845" cy="520" r="42" fill="#FCE38A" />
      <circle cx="862" cy="508" r="36" fill="#101829" />
      <!-- Warm 3D Bedside Lamp Glow -->
      <circle cx="240" cy="1020" r="360" fill="url(#speakerAuraGrad)" />
      <rect x="0" y="1390" width="1080" height="530" fill="#70503B" />
    `;
  }

  if (locationId === 'living') {
    return `
      <defs>
        <linearGradient id="livGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F4EFE6" />
          <stop offset="72%" stop-color="#E4D9C8" />
          <stop offset="100%" stop-color="#BC9B78" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#livGrad)" />
      <!-- 3D Family Library Bookcase -->
      <polygon points="64,450 88,430 88,1160 64,1180" fill="#593E28" />
      <rect x="88" y="430" width="375" height="730" rx="6" fill="#7A583B" filter="url(#dropShadow3D)" />
      <rect x="112" y="460" width="327" height="195" rx="4" fill="#F2EAE0" />
      <rect x="112" y="685" width="327" height="195" rx="4" fill="#F2EAE0" />
      <rect x="130" y="498" width="42" height="156" rx="3" fill="#7C2E2B" />
      <rect x="184" y="498" width="42" height="156" rx="3" fill="#2B3E54" />
      <rect x="238" y="498" width="42" height="156" rx="3" fill="#4E6741" />
      <rect x="292" y="498" width="42" height="156" rx="3" fill="#C86D51" />
      <!-- Warm framed Arabic calligraphy geometric art on right wall -->
      <rect x="640" y="510" width="290" height="360" rx="12" fill="#26211C" stroke="#F4C44E" stroke-width="6" filter="url(#dropShadow3D)" />
      <circle cx="785" cy="690" r="92" fill="none" stroke="rgba(244,196,78,0.45)" stroke-width="3" />
      <text x="785" y="708" font-family="DejaVu Sans, sans-serif" font-size="52" font-weight="bold" fill="#F4C44E" text-anchor="middle">السَّلَامُ</text>
      <rect x="0" y="1385" width="1080" height="535" fill="#B08359" />
      <ellipse cx="540" cy="1620" rx="420" ry="120" fill="#8C3B2B" opacity="0.35" />
    `;
  }

  if (locationId === 'hallway') {
    return `
      <defs>
        <linearGradient id="palGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ECE8E1" />
          <stop offset="75%" stop-color="#D6CEC2" />
          <stop offset="100%" stop-color="#9E8E7B" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#palGrad)" />
      <!-- 3D Apartment Doors for Al Nour (3A) & M. Martin (3B) -->
      <rect x="65" y="470" width="335" height="900" rx="6" fill="#7A5238" stroke="#593A26" stroke-width="10" filter="url(#dropShadow3D)" />
      <rect x="195" y="560" width="75" height="36" rx="6" fill="#F4C44E" />
      <text x="232" y="585" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="bold" fill="#161412" text-anchor="middle">3A</text>
      <rect x="680" y="470" width="335" height="900" rx="6" fill="#4B5D6E" stroke="#364452" stroke-width="10" filter="url(#dropShadow3D)" />
      <rect x="810" y="560" width="75" height="36" rx="6" fill="#E2DFD7" />
      <text x="847" y="585" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="bold" fill="#161412" text-anchor="middle">3B</text>
      <circle cx="540" cy="610" r="240" fill="url(#speakerAuraGrad)" />
      <rect x="0" y="1365" width="1080" height="555" fill="#968776" />
    `;
  }

  // Desert / Oasis Historical Spiritual Immersion (Strictly zero depiction of Prophets)
  return `
    <defs>
      <linearGradient id="desGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0D1528" />
        <stop offset="50%" stop-color="#1D2C4E" />
        <stop offset="78%" stop-color="#6B4E57" />
        <stop offset="100%" stop-color="#C58B61" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#desGrad)" />
    <circle cx="540" cy="820" r="460" fill="rgba(255,232,160,0.25)" />
    <circle cx="540" cy="820" r="210" fill="rgba(255,232,160,0.68)" />
    <path d="M 0 1190 Q 360 1055 780 1205 Q 960 1265 1080 1160 L 1080 1920 L 0 1920 Z" fill="#C98A5B" />
    <path d="M 0 1355 Q 630 1220 1080 1370 L 1080 1920 L 0 1920 Z" fill="#A86B43" />
  `;
}

/**
 * Renders the 3D Glassmorphic Educational HUD Card in the top safe zone (y = 82..405)
 */
function buildEducationalOverlaySvg(overlay: EducationalOverlay): string {
  const accentColor =
    overlay.type === 'hadith_quran_card'
      ? '#F4C44E'
      : overlay.type === 'arabic_term_dua'
      ? '#8CD99E'
      : overlay.type === 'action_tip'
      ? '#9EC5D6'
      : '#E2A857';

  const wrappedMain = wrapTextLines(overlay.mainText, 54, 2);
  const cleanArabic = (overlay.arabicScript || '')
    .replace(/\u0671/g, '\u0627')
    .replace(/\u0670/g, '')
    .trim();
  const hasArabic = Boolean(cleanArabic);
  const arabicFontSize = cleanArabic.length > 42 ? 31 : cleanArabic.length > 28 ? 36 : 42;
  const cardHeight = hasArabic ? 305 : 225;

  const cleanBadge = (overlay.badgeTitle || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '✦')
    .trim();
  const cleanSource = (overlay.sourceOrSubtext || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim();

  const mainLinesSvg = wrappedMain
    .map(
      (line, i) =>
        `<text x="540" y="${(hasArabic ? 286 : 210) + i * 34}" font-family="DejaVu Sans, sans-serif" font-size="25" font-weight="bold" fill="#FAF5ED" text-anchor="middle">${escapeXml(
          line
        )}</text>`
    )
    .join('\n');

  return `
    <g filter="url(#cardShadow3D)">
      <!-- Outer 3D Glass Card -->
      <rect x="56" y="78" width="968" height="${cardHeight}" rx="26" fill="rgba(20, 17, 15, 0.90)" stroke="${accentColor}" stroke-width="3.5" />
      <rect x="66" y="88" width="948" height="${cardHeight - 20}" rx="20" fill="none" stroke="rgba(255, 255, 255, 0.10)" stroke-width="1.5" />

      <!-- Top Category Pill -->
      <rect x="170" y="60" width="740" height="40" rx="20" fill="#1E1B18" stroke="${accentColor}" stroke-width="2.5" />
      <text x="540" y="87" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="bold" fill="${accentColor}" text-anchor="middle" letter-spacing="1">${escapeXml(
        cleanBadge
      )}</text>

      ${
        hasArabic
          ? `
        <!-- Vocalized Arabic Calligraphy + Phonetic Pill -->
        <text x="540" y="160" font-family="DejaVu Sans, sans-serif" font-size="${arabicFontSize}" font-weight="bold" fill="#F4C44E" text-anchor="middle">${escapeXml(
          cleanArabic
        )}</text>
        ${
          overlay.phonetic
            ? `<text x="540" y="202" font-family="DejaVu Sans, sans-serif" font-size="21" font-style="italic" fill="#D5C7B8" text-anchor="middle">« ${escapeXml(
                overlay.phonetic
              )} »</text>`
            : ''
        }
        <line x1="220" y1="224" x2="860" y2="224" stroke="rgba(244, 196, 78, 0.28)" stroke-width="1.5" />
      `
          : ''
      }

      <!-- Main Pedagogical Explanation -->
      ${mainLinesSvg}

      <!-- Source / Citation Footer -->
      ${
        cleanSource
          ? `<text x="540" y="${78 + cardHeight - 22}" font-family="DejaVu Sans, sans-serif" font-size="18.5" font-weight="bold" fill="${accentColor}" text-anchor="middle">${escapeXml(
              cleanSource
            )}</text>`
          : ''
      }
    </g>
  `;
}

/**
 * Renders the Active Speaker Badge & Scene Progress Indicator above the subtitle zone
 */
function buildSpeakerAndProgressHudSvg(scene: SceneVisualSpec): string {
  const speakerLabel = scene.speakerDisplayName || 'Narrateur Al Nour';
  const dotsSvg = Array.from({ length: 8 }, (_, i) => {
    const num = i + 1;
    const isCurrent = num === scene.sceneNumber;
    const isPast = num < scene.sceneNumber;
    const cx = 435 + i * 30;
    return `<circle cx="${cx}" cy="1835" r="${isCurrent ? 9 : 6}" fill="${
      isCurrent ? '#F4C44E' : isPast ? '#8CD99E' : 'rgba(255,255,255,0.28)'
    }" />`;
  }).join('');

  return `
    <g filter="url(#cardShadow3D)">
      <rect x="290" y="1435" width="500" height="52" rx="26" fill="rgba(20, 17, 15, 0.88)" stroke="#F4C44E" stroke-width="2.5" />
      <text x="540" y="1469" font-family="DejaVu Sans, sans-serif" font-size="23" font-weight="bold" fill="#F4C44E" text-anchor="middle">◈ ${escapeXml(
        speakerLabel
      )} ◈</text>
    </g>
    <!-- Bottom Scene Progress Dots -->
    <g>${dotsSvg}</g>
  `;
}

export async function renderSceneIllustration(
  episodeId: string,
  scene: SceneVisualSpec,
  allResidents: ResidentProfile[],
  research?: ResearchDeliverable,
  episodeTitle?: string
): Promise<string> {
  const filename = `${episodeId}_scene_${scene.sceneNumber}_${Date.now()}.png`;
  const filePath = path.join(OUTPUT_DIR, filename);

  const resolvedOverlay = resolveSceneEducationalOverlay(scene, research, episodeTitle);
  scene.educationalOverlay = resolvedOverlay;

  // Optional Free Flux endpoint for historical landscapes if requested
  if (scene.renderEngine === 'flux_free') {
    try {
      const encodedPrompt = encodeURIComponent(
        `${scene.fluxPrompt}, warm minimalist 2.5D stylized illustration, strictly faceless, no facial features, vertical 9:16`
      );
      const fluxUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&model=flux&nologo=true&seed=${scene.sceneNumber * 101}`;
      const res = await fetch(fluxUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 5000) {
          fs.writeFileSync(filePath, buf);
          return `/media/${filename}`;
        }
      }
    } catch {
      // Fallback transparently to deterministic 2.5D/3D SVG engine
    }
  }

  const activeResidents = scene.residentIds
    .map(id => allResidents.find(r => r.id === id))
    .filter((r): r is ResidentProfile => Boolean(r));

  const count = activeResidents.length;
  const charsSvg = activeResidents
    .map((char, idx) => {
      let cx = 540;
      if (count === 2) cx = idx === 0 ? 355 : 735;
      if (count === 3) cx = idx === 0 ? 260 : idx === 1 ? 560 : 835;
      const isSpeaker = char.id === scene.speakerId || (idx === 0 && scene.speakerId === 'narrator');
      return buildCharacterSvgGroup(char, cx, 1425, idx, scene.pose, isSpeaker);
    })
    .join('\n');

  const particlesSvg = Array.from({ length: 18 }, (_, i) => {
    const px = ((i * 157 + scene.sceneNumber * 43) % 1000) + 40;
    const py = ((i * 193 + scene.sceneNumber * 71) % 920) + 440;
    const r = 3.5 + (i % 3) * 2.8;
    return `<circle cx="${px}" cy="${py}" r="${r}" fill="rgba(255,228,148,0.52)" />`;
  }).join('\n');

  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs>
        <filter id="dropShadow3D" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#0A0806" flood-opacity="0.38" />
        </filter>
        <filter id="cardShadow3D" x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#050403" flood-opacity="0.55" />
        </filter>
        <radialGradient id="speakerAuraGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(244, 196, 78, 0.34)" />
          <stop offset="100%" stop-color="rgba(244, 196, 78, 0)" />
        </radialGradient>
        <radialGradient id="windowGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="rgba(255, 245, 200, 0.95)" />
          <stop offset="100%" stop-color="rgba(255, 215, 120, 0.4)" />
        </radialGradient>
        <linearGradient id="sunbeam3D" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255, 232, 165, 0.32)" />
          <stop offset="100%" stop-color="rgba(255, 232, 165, 0.02)" />
        </linearGradient>
        <linearGradient id="floorGradExt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8A7F73" />
          <stop offset="100%" stop-color="#5C534A" />
        </linearGradient>
        <linearGradient id="bottomSubGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(16, 13, 11, 0)" />
          <stop offset="45%" stop-color="rgba(16, 13, 11, 0.72)" />
          <stop offset="100%" stop-color="rgba(12, 10, 8, 0.92)" />
        </linearGradient>
      </defs>

      <!-- 1. 2.5D/3D Architectural & HLM Room Layer -->
      ${buildRoomBackgroundSvg(scene.locationId)}

      <!-- 2. Characters with 3D Depth Shadows & Active Speaker Aura -->
      ${charsSvg}

      <!-- 3. Floating Golden Light Dust Particles -->
      ${particlesSvg}

      <!-- 4. Bottom Cinematic Vignette for High-Contrast Subtitles -->
      <rect x="0" y="1400" width="1080" height="520" fill="url(#bottomSubGrad)" />

      <!-- 5. Top Educational HUD Card (Hadith / Du'a / Arabic Key Term / Action Tip) -->
      ${buildEducationalOverlaySvg(resolvedOverlay)}

      <!-- 6. Active Speaker Pill & 8-Scene Progress Dots -->
      ${buildSpeakerAndProgressHudSvg(scene)}
    </svg>
  `;

  const resvg = new Resvg(fullSvg, {
    fitTo: { mode: 'width', value: 1080 }
  });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(filePath, pngBuffer);

  return `/media/${filename}`;
}
