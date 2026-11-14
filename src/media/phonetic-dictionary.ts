export interface PhoneticMapping {
  term: string;
  pattern: RegExp;
  arabicScript: string;
  frenchPhonetic: string;
}

export const ISLAMIC_PHONETIC_GLOSSARY: PhoneticMapping[] = [
  { term: 'Bismillah', pattern: /\bBismillah(i| ar-Rahman ar-Rahim)?\b/gi, arabicScript: 'بِسْمِ ٱللَّٰهِ', frenchPhonetic: 'Biss-mil-lah' },
  { term: 'Alhamdulillah', pattern: /\bAlhamdulillah\b/gi, arabicScript: 'ٱلْحَمْدُ لِلَّٰهِ', frenchPhonetic: 'Al-ham-dou-lil-lah' },
  { term: 'SubhanAllah', pattern: /\bSubhanAllah\b/gi, arabicScript: 'سُبْحَانَ ٱللَّٰهِ', frenchPhonetic: 'Soub-ha-nal-lah' },
  { term: 'InshaAllah', pattern: /\bInshaAllah\b/gi, arabicScript: 'إِن شَاءَ ٱللَّٰهُ', frenchPhonetic: 'In-cha-Al-lah' },
  { term: 'MashaAllah', pattern: /\bMashaAllah\b/gi, arabicScript: 'مَا شَاءَ ٱللَّٰهُ', frenchPhonetic: 'Ma-cha-Al-lah' },
  { term: 'Astaghfirullah', pattern: /\bAstaghfirullah\b/gi, arabicScript: 'أَسْتَغْفِرُ ٱللَّٰهَ', frenchPhonetic: 'Ass-tagh-fi-roul-lah' },
  { term: 'Assalamou Alaykoum', pattern: /\b(As-?salamou|Assalamou)\s+Alaykoum( wa Rahmatoullah)?\b/gi, arabicScript: 'ٱلسَّلَامُ عَلَيْكُمْ', frenchPhonetic: 'As-sa-la-mou a-lay-koum' },
  { term: 'Salam', pattern: /\bSalam\b/gi, arabicScript: 'سَلَام', frenchPhonetic: 'Sa-lam' },
  { term: 'Rahma', pattern: /\bRahma\b/gi, arabicScript: 'رَحْمَة', frenchPhonetic: 'Rah-ma' },
  { term: 'Sabr', pattern: /\bSabr\b/gi, arabicScript: 'صَبْر', frenchPhonetic: 'Sab-re' },
  { term: 'Adab', pattern: /\bAdab\b/gi, arabicScript: 'أَدَب', frenchPhonetic: 'A-dabe' },
  { term: 'Akhlaq', pattern: /\bAkhlaq\b/gi, arabicScript: 'أَخْلَاق', frenchPhonetic: 'Akh-laq' },
  { term: 'Sadaqa', pattern: /\bSadaqa\b/gi, arabicScript: 'صَدَقَة', frenchPhonetic: 'Sa-da-qa' },
  { term: 'Baraka', pattern: /\bBaraka\b/gi, arabicScript: 'بَرَكَة', frenchPhonetic: 'Ba-ra-ka' },
  { term: 'Tawakkul', pattern: /\bTawakkul\b/gi, arabicScript: 'تَوَكُّل', frenchPhonetic: 'Ta-wak-koul' },
  { term: 'Hadith', pattern: /\bhadith(s)?\b/gi, arabicScript: 'حَدِيث', frenchPhonetic: 'Ha-diss' },
  { term: 'Sourate', pattern: /\bsourate\b/gi, arabicScript: 'سُورَة', frenchPhonetic: 'Sou-rate' },
  { term: 'Al Nour', pattern: /\bAl[- ]?Nour\b/gi, arabicScript: 'النُّور', frenchPhonetic: 'Al-Nour' }
];

export function splitTextIntoLinguisticTokens(text: string): Array<{ text: string; lang: 'fr' | 'ar' }> {
  let processed = text;
  const segments: Array<{ text: string; lang: 'fr' | 'ar' }> = [];

  const markers: Array<{ start: number; end: number; arabicScript: string }> = [];

  for (const item of ISLAMIC_PHONETIC_GLOSSARY) {
    let match: RegExpExecArray | null;
    const re = new RegExp(item.pattern.source, 'gi');
    while ((match = re.exec(text)) !== null) {
      markers.push({
        start: match.index,
        end: match.index + match[0].length,
        arabicScript: item.arabicScript
      });
    }
  }

  if (markers.length === 0) {
    return [{ text, lang: 'fr' }];
  }

  markers.sort((a, b) => a.start - b.start);

  let cursor = 0;
  for (const m of markers) {
    if (m.start > cursor) {
      const frChunk = text.slice(cursor, m.start).trim();
      if (frChunk) segments.push({ text: frChunk, lang: 'fr' });
    }
    segments.push({ text: m.arabicScript, lang: 'ar' });
    cursor = m.end;
  }

  if (cursor < text.length) {
    const remaining = text.slice(cursor).trim();
    if (remaining) segments.push({ text: remaining, lang: 'fr' });
  }

  return segments;
}

export function formatPhoneticFrench(text: string): {
  phoneticText: string;
  applied: Array<{ original: string; phonetic: string }>;
} {
  let phoneticText = text;
  const applied: Array<{ original: string; phonetic: string }> = [];

  for (const item of ISLAMIC_PHONETIC_GLOSSARY) {
    if (item.pattern.test(phoneticText)) {
      applied.push({ original: item.term, phonetic: item.frenchPhonetic });
      phoneticText = phoneticText.replace(item.pattern, item.frenchPhonetic);
    }
  }

  return { phoneticText, applied };
}
