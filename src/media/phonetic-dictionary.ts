export interface PhoneticEntry {
  term: string;
  regex: RegExp;
  ttsReplacement: string;
}

export const ISLAMIC_PHONETIC_DICTIONARY: PhoneticEntry[] = [
  { term: 'Bismillah', regex: /\bBismillah\b/gi, ttsReplacement: 'Bismi-llah' },
  { term: 'Alhamdulillah', regex: /\bAlhamdulillah\b/gi, ttsReplacement: 'Al-hamdou-lillah' },
  { term: 'SubhanAllah', regex: /\bSubhanAllah\b/gi, ttsReplacement: 'Soub-hanallah' },
  { term: 'InshaAllah', regex: /\bInshaAllah\b/gi, ttsReplacement: 'In-cha-Allah' },
  { term: 'MashaAllah', regex: /\bMashaAllah\b/gi, ttsReplacement: 'Ma-cha-Allah' },
  { term: 'Astaghfirullah', regex: /\bAstaghfirullah\b/gi, ttsReplacement: 'Astar-firoullah' },
  { term: 'Salam', regex: /\bSalam\b/gi, ttsReplacement: 'Salame' },
  { term: 'Assalamou Alaykoum', regex: /\bAssalamou Alaykoum\b/gi, ttsReplacement: 'As-salamou alaykoume' },
  { term: 'Rahma', regex: /\bRahma\b/gi, ttsReplacement: 'Rah-ma' },
  { term: 'Sabr', regex: /\bSabr\b/gi, ttsReplacement: 'Sabre' },
  { term: 'Adab', regex: /\bAdab\b/gi, ttsReplacement: 'Adabe' },
  { term: 'Akhlaq', regex: /\bAkhlaq\b/gi, ttsReplacement: 'Akh-laq' },
  { term: 'Sadaqa', regex: /\bSadaqa\b/gi, ttsReplacement: 'Sada-qa' },
  { term: 'Baraka', regex: /\bBaraka\b/gi, ttsReplacement: 'Bara-ka' },
  { term: 'Hadith', regex: /\bhadith(s)?\b/gi, ttsReplacement: 'hadisse' },
  { term: 'Sourate', regex: /\bsourate\b/gi, ttsReplacement: 'sourate' },
  { term: 'Al Nour', regex: /\bAl[- ]?Nour\b/gi, ttsReplacement: 'Al-Nour' }
];

export function applyIslamicPhonetics(text: string): {
  phoneticText: string;
  applied: Array<{ original: string; phonetic: string }>;
} {
  let phoneticText = text;
  const applied: Array<{ original: string; phonetic: string }> = [];

  for (const entry of ISLAMIC_PHONETIC_DICTIONARY) {
    if (entry.regex.test(phoneticText)) {
      applied.push({ original: entry.term, phonetic: entry.ttsReplacement });
      phoneticText = phoneticText.replace(entry.regex, entry.ttsReplacement);
    }
  }

  return { phoneticText, applied };
}
