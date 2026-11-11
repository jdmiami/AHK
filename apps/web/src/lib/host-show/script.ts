/**
 * What the announcer says. Short, varied lines; `{name}` and `{song}` are filled in.
 */

export type HostLocale = 'en' | 'es';

const NOISE = [
    /\((?:official|oficial|lyric|lyrics|letra|karaoke|audio|video|hd|4k|remaster(?:ed)?|live|en vivo|music video|visualizer)[^)]*\)/gi,
    /\[[^\]]*\]/g,
    /\b(?:official\s+(?:music\s+)?video|official\s+audio|lyric\s+video|with\s+lyrics|karaoke\s+version|karaoke|instrumental|hd|4k|remastered(?:\s+\d{4})?)\b/gi,
];

/** "Queen – Bohemian Rhapsody (Official Video Remastered)" → "Bohemian Rhapsody, by Queen". */
export function speakableTitle(title: string, locale: HostLocale = 'en'): string {
    let text = title;
    for (const pattern of NOISE) text = text.replace(pattern, ' ');
    text = text
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[|•·]+.*$/, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const parts = text.split(/\s+[-–—]\s+/);
    if (parts.length === 2 && parts[0] && parts[1]) {
        const [artist, song] = parts;
        text =
            locale === 'es'
                ? `${song.trim()}, de ${artist.trim()}`
                : `${song.trim()}, by ${artist.trim()}`;
    }
    text = text.replace(/[-–—,\s]+$/, '').trim();
    return text.length > 80
        ? `${text.slice(0, 80).replace(/\s+\S*$/, '')}`
        : text || title.slice(0, 60);
}

const LINES: Record<
    HostLocale,
    Record<'thanks' | 'thanksHouse' | 'intro' | 'introHouse' | 'invite' | 'welcome', string[]>
> = {
    en: {
        thanks: [
            'Give it up for {name}!',
            'What a performance! Let’s hear it for {name}!',
            '{name}, everybody! Make some noise!',
            'Big love for {name}!',
        ],
        thanksHouse: ['Make some noise!', 'Let’s hear it, everybody!'],
        intro: [
            'Next up: {name}, singing {song}!',
            'Coming to the mic, {name}, with {song}!',
            'Get ready, {name}! You’re up with {song}!',
            'Put your hands together for {name}, singing {song}!',
        ],
        introHouse: ['Next up: {song}!', 'Coming up next: {song}!'],
        invite: [
            'The stage is open! Grab your phone, scan the code, and add a song to keep the party going.',
            'Who’s next? Scan the code on the screen and pick your song!',
            'The mic is waiting for you. Add a song from your phone and take the stage!',
        ],
        welcome: [
            'Welcome to Artist House Karaoke! Scan the code on the screen and pick your song.',
        ],
    },
    es: {
        thanks: [
            '¡Un aplauso para {name}!',
            '¡Qué actuación! ¡Que se oiga para {name}!',
            '¡{name}, señoras y señores! ¡A hacer ruido!',
        ],
        thanksHouse: ['¡A hacer ruido!', '¡Un aplauso, todos!'],
        intro: [
            '¡Sigue {name}, cantando {song}!',
            '¡Al micrófono, {name}, con {song}!',
            '¡Prepárate, {name}! Te toca con {song}!',
        ],
        introHouse: ['¡Sigue: {song}!', '¡A continuación, {song}!'],
        invite: [
            '¡El escenario está libre! Escanea el código y añade una canción para seguir la fiesta.',
            '¿Quién sigue? Escanea el código de la pantalla y elige tu canción.',
        ],
        welcome: ['¡Bienvenidos a Artist House Karaoke! Escanea el código y elige tu canción.'],
    },
};

export type LineKind = keyof (typeof LINES)['en'];

/** A random line of this kind (never the same one twice in a row). */
export function hostLine(
    kind: LineKind,
    locale: HostLocale,
    values: { name?: string; song?: string } = {},
    random: () => number = Math.random,
): string {
    const options = LINES[locale][kind];
    const key = `${locale}:${kind}`;
    let index = Math.floor(random() * options.length);
    if (options.length > 1 && index === lastPick.get(key)) index = (index + 1) % options.length;
    lastPick.set(key, index);
    return options[index]!.replace('{name}', values.name ?? '').replace(
        '{song}',
        values.song ?? '',
    );
}

const lastPick = new Map<string, number>();

export function toHostLocale(locale: string): HostLocale {
    return locale.startsWith('es') ? 'es' : 'en';
}
