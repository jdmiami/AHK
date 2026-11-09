/** Kinds of alternate-key uploads karaoke channels commonly publish. */
export const KEY_VERSION_KINDS = ['lower', 'higher', 'female', 'male'] as const;
export type KeyVersionKind = (typeof KEY_VERSION_KINDS)[number];

const KIND_QUERY: Record<KeyVersionKind, string> = {
    lower: 'karaoke lower key',
    higher: 'karaoke higher key',
    female: 'karaoke female key',
    male: 'karaoke male key',
};

/** Noise in karaoke titles that hurts a "same song, other key" search. */
const TITLE_NOISE =
    /\b(karaoke|instrumental|version|lyrics?|letra|with|con|official|video|audio|hd|4k|beat|minus\s*one|backing\s*track|sing\s*along|lower|higher|key|female|male|tono|[+-]?\d+\s*(semitones?|st))\b/gi;

/** Song title without brackets, channel suffixes and karaoke noise words. */
export function songTitleForKeySearch(title: string): string {
    return title
        .replace(/[([{【][^)\]}】]*[)\]}】]/g, ' ')
        .split(/\s[|•·]\s/)[0]!
        .replace(TITLE_NOISE, ' ')
        .replace(/[-–—_:]+\s*$/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function keyVersionQuery(title: string, kind: KeyVersionKind): string {
    const song = songTitleForKeySearch(title) || title.trim();
    return `${song} ${KIND_QUERY[kind]}`;
}

/** Titles that say they are in another key ("Lower Key", "-2", "Female Key", "Tono Mujer"…). */
const KEY_HINT =
    /\b(lower|higher|female|male|women'?s?|men'?s?|key|tono|mujer|hombre)\b|[+-]\s?\d\b|\b\d\s?(semitones?|st)\b/i;

/** Rank uploads that mention a key change first; drop the song already playing. */
export function rankKeyVersions<T extends { id: string; title: string }>(
    items: readonly T[],
    playingId: string | null,
    limit = 6,
): T[] {
    const others = items.filter((item) => item.id !== playingId);
    const hinted = others.filter((item) => KEY_HINT.test(item.title));
    const rest = others.filter((item) => !KEY_HINT.test(item.title));
    return [...hinted, ...rest].slice(0, limit);
}
