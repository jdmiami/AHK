/**
 * Random karaoke stage names. English: "Velvet Falcon". Spanish puts the adjective after the
 * noun and agrees in gender: "Halcón Eléctrico", "Estrella Eléctrica".
 */
const EN_ADJECTIVES = [
    'Velvet',
    'Neon',
    'Golden',
    'Electric',
    'Midnight',
    'Cosmic',
    'Disco',
    'Smooth',
    'Wild',
    'Funky',
    'Silver',
    'Thunder',
    'Crystal',
    'Retro',
    'Lucky',
    'Sonic',
    'Starry',
    'Groovy',
    'Fearless',
    'Royal',
] as const;

const EN_NOUNS = [
    'Falcon',
    'Crooner',
    'Diva',
    'Tiger',
    'Phoenix',
    'Comet',
    'Panther',
    'Siren',
    'Rocket',
    'Maestro',
    'Fox',
    'Nightingale',
    'Legend',
    'Wolf',
    'Star',
    'Dragon',
    'Echo',
    'Flamingo',
    'Ranger',
    'Voice',
] as const;

type Gendered = { m: string; f: string };
const ES_ADJECTIVES: Gendered[] = [
    { m: 'Eléctrico', f: 'Eléctrica' },
    { m: 'Dorado', f: 'Dorada' },
    { m: 'Cósmico', f: 'Cósmica' },
    { m: 'Salvaje', f: 'Salvaje' },
    { m: 'Brillante', f: 'Brillante' },
    { m: 'de Terciopelo', f: 'de Terciopelo' },
    { m: 'de Neón', f: 'de Neón' },
    { m: 'Nocturno', f: 'Nocturna' },
    { m: 'Plateado', f: 'Plateada' },
    { m: 'Valiente', f: 'Valiente' },
    { m: 'Galáctico', f: 'Galáctica' },
    { m: 'Legendario', f: 'Legendaria' },
];
const ES_NOUNS: Array<{ word: string; gender: 'm' | 'f' }> = [
    { word: 'Halcón', gender: 'm' },
    { word: 'Tigre', gender: 'm' },
    { word: 'Fénix', gender: 'm' },
    { word: 'Cometa', gender: 'm' },
    { word: 'Lobo', gender: 'm' },
    { word: 'Dragón', gender: 'm' },
    { word: 'Ruiseñor', gender: 'm' },
    { word: 'Estrella', gender: 'f' },
    { word: 'Pantera', gender: 'f' },
    { word: 'Sirena', gender: 'f' },
    { word: 'Diva', gender: 'f' },
    { word: 'Voz', gender: 'f' },
];

function pick<T>(list: readonly T[], random: () => number): T {
    return list[Math.floor(random() * list.length) % list.length]!;
}

export function randomStageName(locale: string, random: () => number = Math.random): string {
    if (locale === 'es') {
        const noun = pick(ES_NOUNS, random);
        const adjective = pick(ES_ADJECTIVES, random);
        return `${noun.word} ${adjective[noun.gender]}`;
    }
    return `${pick(EN_ADJECTIVES, random)} ${pick(EN_NOUNS, random)}`;
}
