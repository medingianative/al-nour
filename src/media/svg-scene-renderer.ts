import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { ResidentProfile } from '../bible/series-bible.js';
import { SceneVisualSpec } from '../harness/types.js';

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'media');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function buildCharacterSvgGroup(
  char: ResidentProfile,
  cx: number,
  baseY: number,
  idx: number,
  poseMode: SceneVisualSpec['pose']
): string {
  const v = char.visual;
  const s = v.scale * 3.1; // Scale for 1080x1920 canvas
  const isSpeaker = idx === 0;
  const headTiltDeg = idx > 0 ? -2.2 : 1.6;
  const torsoTopY = -152;
  const hipY = -64;
  const legTopY = -68;
  const shoeY = -6;

  let outfitSvg = '';
  if (v.outfitType === 'casual_sweater_shirt') {
    outfitSvg = `
      <rect x="-33" y="${torsoTopY + 8}" width="66" height="${hipY - (torsoTopY + 8)}" rx="12" fill="${v.top}" />
      <polygon points="-12,${torsoTopY + 6} -5,${torsoTopY + 17} 0,${torsoTopY + 11} 5,${torsoTopY + 17} 12,${torsoTopY + 6}" fill="${v.shirt}" />
    `;
  } else if (v.outfitType === 'modest_cardigan_pants') {
    outfitSvg = `
      <rect x="-30" y="${torsoTopY + 8}" width="60" height="${hipY - (torsoTopY + 8)}" rx="10" fill="${v.shirt}" />
      <rect x="-34" y="${torsoTopY + 8}" width="21" height="94" rx="8" fill="${v.top}" />
      <rect x="13" y="${torsoTopY + 8}" width="21" height="94" rx="8" fill="${v.top}" />
      <path d="M -21 ${torsoTopY + 8} A 21 11 0 0 0 21 ${torsoTopY + 8} Z" fill="${v.top2}" />
    `;
  } else if (v.outfitType === 'grandpa_cardigan') {
    outfitSvg = `
      <rect x="-32" y="${torsoTopY + 8}" width="64" height="${hipY - (torsoTopY + 8)}" rx="10" fill="${v.shirt}" />
      <polygon points="-33,${torsoTopY + 10} -11,${torsoTopY + 8} 0,${torsoTopY + 34} 11,${torsoTopY + 8} 33,${torsoTopY + 10} 33,${hipY} -33,${hipY}" fill="${v.top}" />
    `;
  } else if (v.outfitType === 'western_blazer_casual') {
    outfitSvg = `
      <rect x="-32" y="${torsoTopY + 8}" width="64" height="${hipY - (torsoTopY + 8)}" rx="8" fill="${v.shirt}" />
      <rect x="-33" y="${torsoTopY + 8}" width="66" height="${hipY - (torsoTopY + 8)}" rx="12" fill="${v.top}" />
      <polygon points="-12,${torsoTopY + 6} 0,${torsoTopY + 22} 12,${torsoTopY + 6}" fill="${v.shirt}" />
    `;
  } else if (v.outfitType === 'streetwear_hoodie') {
    outfitSvg = `
      <ellipse cx="0" cy="${torsoTopY + 8}" rx="28" ry="12" fill="${v.top2}" />
      <rect x="-33" y="${torsoTopY + 8}" width="66" height="${hipY - (torsoTopY + 6)}" rx="12" fill="${v.top}" />
    `;
  } else if (v.outfitType === 'kid_overalls') {
    outfitSvg = `
      <rect x="-30" y="${torsoTopY + 10}" width="60" height="${hipY - (torsoTopY + 10)}" rx="12" fill="${v.shirt}" />
      <rect x="-19" y="${torsoTopY + 30}" width="38" height="${hipY - (torsoTopY + 26)}" fill="${v.top}" />
      <rect x="-20" y="${torsoTopY + 10}" width="8" height="25" fill="${v.top}" />
      <rect x="12" y="${torsoTopY + 10}" width="8" height="25" fill="${v.top}" />
    `;
  } else {
    outfitSvg = `
      <rect x="-33" y="${torsoTopY + 8}" width="66" height="94" rx="12" fill="${v.top}" />
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
  } else if (poseMode === 'heart' && isSpeaker) {
    lHandX = -6;
    lHandY = torsoTopY + 44;
    lArmPath = `M -33 ${torsoTopY + 20} Q -40 ${torsoTopY + 58} ${lHandX} ${lHandY}`;
  } else if (poseMode === 'dialogue' && isSpeaker) {
    rHandX = 44;
    rHandY = torsoTopY + 48;
    rArmPath = `M 33 ${torsoTopY + 20} Q 48 ${torsoTopY + 64} ${rHandX} ${rHandY}`;
  } else if (poseMode === 'reading' && isSpeaker) {
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
    headwearSvg += `<ellipse cx="0" cy="0" rx="27" ry="32" fill="${hColor}" />`;
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
    <g transform="translate(${cx}, ${baseY}) scale(${s})">
      <ellipse cx="0" cy="0" rx="42" ry="9" fill="rgba(30,20,15,0.2)" />
      <rect x="-25" y="${legTopY}" width="21" height="62" rx="6" fill="${v.pants}" />
      <rect x="4" y="${legTopY}" width="21" height="62" rx="6" fill="${v.pants}" />
      <rect x="-28" y="${shoeY - 8}" width="25" height="11" rx="4" fill="${v.shoes}" />
      <rect x="3" y="${shoeY - 8}" width="25" height="11" rx="4" fill="${v.shoes}" />
      ${outfitSvg}
      <path d="${lArmPath}" stroke="${sleeveColor}" stroke-width="15" stroke-linecap="round" fill="none" />
      <path d="${rArmPath}" stroke="${sleeveColor}" stroke-width="15" stroke-linecap="round" fill="none" />
      <circle cx="${lHandX}" cy="${lHandY}" r="7.5" fill="${v.skin}" />
      <circle cx="${rHandX}" cy="${rHandY}" r="7.5" fill="${v.skin}" />
      <rect x="-9" y="${torsoTopY - 10}" width="18" height="20" rx="7" fill="${v.skin}" />
      <g transform="translate(0, ${torsoTopY - 34}) rotate(${headTiltDeg})">
        ${headwearSvg}
        <ellipse cx="0" cy="0" rx="22" ry="28" fill="${v.skin}" />
        ${topHairSvg}
      </g>
    </g>
  `;
}

function buildRoomBackgroundSvg(locationId: SceneVisualSpec['locationId']): string {
  if (locationId === 'hlm_ext') {
    let windowsSvg = '';
    for (let row = 0; row < 5; row++) {
      const wy = 220 + row * 190;
      for (let col = 0; col < 3; col++) {
        const wx = 270 + col * 195;
        const isLit = (row + col) % 2 === 0 || (row === 2 && col === 1);
        windowsSvg += `
          <rect x="${wx}" y="${wy}" width="132" height="132" fill="${isLit ? '#FFE299' : '#435368'}" stroke="#8C8277" stroke-width="6" />
          <line x1="${wx + 66}" y1="${wy}" x2="${wx + 66}" y2="${wy + 132}" stroke="#8C8277" stroke-width="5" />
          <rect x="${wx - 12}" y="${wy + 102}" width="156" height="34" fill="#7C746B" />
        `;
      }
    }
    return `
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#354F6E" />
          <stop offset="40%" stop-color="#7A6C82" />
          <stop offset="70%" stop-color="#DF9A6D" />
          <stop offset="100%" stop-color="#F2C785" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#skyGrad)" />
      <rect x="55" y="400" width="195" height="900" fill="rgba(55,58,78,0.45)" />
      <rect x="880" y="490" width="165" height="810" fill="rgba(55,58,78,0.45)" />
      <rect x="175" y="155" width="730" height="1160" fill="#E6DDD0" />
      <rect x="175" y="155" width="54" height="1160" fill="#C86D51" />
      <rect x="851" y="155" width="54" height="1160" fill="#C86D51" />
      <rect x="155" y="132" width="770" height="28" fill="#6A625B" />
      ${windowsSvg}
      <rect x="405" y="1155" width="270" height="160" fill="#2B3A4A" />
      <rect x="426" y="1176" width="228" height="135" fill="#FFE299" opacity="0.75" />
      <circle cx="155" cy="1245" r="125" fill="#435E3B" />
      <circle cx="945" cy="1230" r="138" fill="#435E3B" />
      <rect x="0" y="1310" width="1080" height="610" fill="#8F8478" />
    `;
  }

  if (locationId === 'hlm_hall') {
    let boxesSvg = '';
    for (let mr = 0; mr < 4; mr++) {
      for (let mc = 0; mc < 3; mc++) {
        const mx = 90 + mc * 144;
        const my = 420 + mr * 130;
        boxesSvg += `
          <rect x="${mx}" y="${my}" width="130" height="114" fill="#B89B72" stroke="#7A6344" stroke-width="5" />
          <rect x="${mx + 24}" y="${my + 24}" width="80" height="18" fill="#FAF6F0" />
          <rect x="${mx + 18}" y="${my + 60}" width="94" height="9" fill="#4A3C2A" />
        `;
      }
    }
    return `
      <defs>
        <linearGradient id="hallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#EDE7DF" />
          <stop offset="75%" stop-color="#D9D0C4" />
          <stop offset="100%" stop-color="#9E9386" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#hallGrad)" />
      <rect x="630" y="255" width="375" height="1095" fill="#9EC5D6" stroke="#3F4A54" stroke-width="18" />
      <circle cx="810" cy="780" r="145" fill="#58784E" />
      <rect x="66" y="390" width="465" height="555" fill="#B89B72" stroke="#7A6344" stroke-width="10" />
      ${boxesSvg}
      <rect x="0" y="1350" width="1080" height="570" fill="#A89F94" />
    `;
  }

  if (locationId === 'kitchen') {
    return `
      <defs>
        <linearGradient id="kitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F6F1EA" />
          <stop offset="70%" stop-color="#EAE0D3" />
          <stop offset="100%" stop-color="#D5C3AE" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#kitGrad)" />
      <rect x="675" y="195" width="315" height="465" fill="#FFFDF7" stroke="#5C5349" stroke-width="15" />
      <line x1="832" y1="195" x2="832" y2="660" stroke="#5C5349" stroke-width="12" />
      <line x1="675" y1="426" x2="990" y2="426" stroke="#5C5349" stroke-width="12" />
      <rect x="84" y="465" width="435" height="24" fill="#B8895E" />
      <circle cx="405" cy="405" r="42" fill="#4E6741" />
      <rect x="378" y="420" width="54" height="45" fill="#C86D51" />
      <polygon points="675,210 1005,210 630,1740 90,1740" fill="rgba(255,228,150,0.28)" />
      <rect x="0" y="1340" width="1080" height="580" fill="#6E7E71" />
      <rect x="0" y="1308" width="1080" height="42" fill="#F7F4EF" />
      <rect x="744" y="1212" width="186" height="96" rx="18" fill="#C86D51" />
    `;
  }

  if (locationId === 'bedroom') {
    return `
      <defs>
        <linearGradient id="bedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#22304A" />
          <stop offset="65%" stop-color="#314260" />
          <stop offset="100%" stop-color="#4E3F3B" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#bedGrad)" />
      <rect x="615" y="210" width="354" height="465" fill="#121B2E" stroke="#EAE2D7" stroke-width="15" />
      <rect x="660" y="375" width="165" height="300" fill="#26344D" />
      <rect x="690" y="420" width="36" height="36" fill="#FFE299" />
      <rect x="756" y="486" width="36" height="36" fill="#FFE299" />
      <circle cx="845" cy="310" r="42" fill="#FCE38A" />
      <circle cx="862" cy="298" r="36" fill="#121B2E" />
      <circle cx="220" cy="930" r="340" fill="rgba(255,198,110,0.22)" />
      <rect x="0" y="1410" width="1080" height="510" fill="#7C5A43" />
    `;
  }

  if (locationId === 'living') {
    return `
      <defs>
        <linearGradient id="livGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F7F3EC" />
          <stop offset="72%" stop-color="#EAE1D3" />
          <stop offset="100%" stop-color="#C5A482" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#livGrad)" />
      <rect x="84" y="255" width="375" height="720" fill="#7A583B" />
      <rect x="108" y="285" width="327" height="195" fill="#F2EAE0" />
      <rect x="108" y="510" width="327" height="195" fill="#F2EAE0" />
      <rect x="126" y="324" width="42" height="156" fill="#7C2E2B" />
      <rect x="180" y="324" width="42" height="156" fill="#2B3E54" />
      <rect x="234" y="324" width="42" height="156" fill="#4E6741" />
      <rect x="288" y="324" width="42" height="156" fill="#C86D51" />
      <rect x="0" y="1395" width="1080" height="525" fill="#B88B61" />
    `;
  }

  if (locationId === 'hallway') {
    return `
      <defs>
        <linearGradient id="palGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#EFECE6" />
          <stop offset="75%" stop-color="#DDD6CA" />
          <stop offset="100%" stop-color="#A69683" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#palGrad)" />
      <rect x="60" y="330" width="345" height="1035" fill="#7A5238" />
      <rect x="675" y="330" width="345" height="1035" fill="#536475" />
      <circle cx="540" cy="495" r="240" fill="rgba(255,222,150,0.42)" />
      <circle cx="540" cy="495" r="27" fill="#F6D27A" />
      <rect x="0" y="1365" width="1080" height="555" fill="#9E8F7E" />
    `;
  }

  // Desert / Oasis Historical Immersion (Strictly zero depiction of Prophets)
  return `
    <defs>
      <linearGradient id="desGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0D1528" />
        <stop offset="55%" stop-color="#1D2C4E" />
        <stop offset="80%" stop-color="#6B4E57" />
        <stop offset="100%" stop-color="#C58B61" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#desGrad)" />
    <circle cx="540" cy="750" r="460" fill="rgba(255,232,160,0.28)" />
    <circle cx="540" cy="750" r="220" fill="rgba(255,232,160,0.65)" />
    <path d="M 0 1170 Q 360 1035 780 1185 Q 960 1245 1080 1140 L 1080 1920 L 0 1920 Z" fill="#C98A5B" />
    <path d="M 0 1335 Q 630 1200 1080 1350 L 1080 1920 L 0 1920 Z" fill="#A86B43" />
  `;
}

export async function renderSceneIllustration(
  episodeId: string,
  scene: SceneVisualSpec,
  allResidents: ResidentProfile[]
): Promise<string> {
  const filename = `${episodeId}_scene_${scene.sceneNumber}_${Date.now()}.png`;
  const filePath = path.join(OUTPUT_DIR, filename);

  // Optional Free Flux endpoint for historical landscapes if requested
  if (scene.renderEngine === 'flux_free') {
    try {
      const encodedPrompt = encodeURIComponent(
        `${scene.fluxPrompt}, warm minimalist 2D illustration, strictly faceless, no facial features, vertical 9:16`
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
      // Fallback transparently to deterministic 2D SVG engine
    }
  }

  const activeResidents = scene.residentIds
    .map(id => allResidents.find(r => r.id === id))
    .filter((r): r is ResidentProfile => Boolean(r));

  const count = activeResidents.length;
  const charsSvg = activeResidents
    .map((char, idx) => {
      let cx = 540;
      if (count === 2) cx = idx === 0 ? 365 : 735;
      if (count === 3) cx = idx === 0 ? 270 : idx === 1 ? 570 : 840;
      return buildCharacterSvgGroup(char, cx, 1485, idx, scene.pose);
    })
    .join('\n');

  const particlesSvg = Array.from({ length: 16 }, (_, i) => {
    const px = (i * 157 + scene.sceneNumber * 43) % 1020 + 30;
    const py = (i * 233 + scene.sceneNumber * 71) % 1400 + 80;
    const r = 4 + (i % 3) * 3;
    return `<circle cx="${px}" cy="${py}" r="${r}" fill="rgba(255,228,148,0.45)" />`;
  }).join('\n');

  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      ${buildRoomBackgroundSvg(scene.locationId)}
      ${charsSvg}
      ${particlesSvg}
    </svg>
  `;

  const resvg = new Resvg(fullSvg, {
    fitTo: { mode: 'width', value: 1080 }
  });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(filePath, pngBuffer);

  return `/media/${filename}`;
}
