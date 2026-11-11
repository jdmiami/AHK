/**
 * Party features: cheer emoji that pop on the big screen, and the room chat.
 * Chat lives on the room (last CHAT_HISTORY lines); cheers are sent and forgotten.
 */

export const REACTION_EMOJIS = ['❤️', '👏', '🔥', '🎉', '😍', '🙌', '🌟', '😂'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const CHAT_MAX_LENGTH = 200;
/** Lines kept on the room (what a phone that joins late can scroll back through). */
export const CHAT_HISTORY = 50;
/** Lines shown at the bottom of the big screen. */
export const CHAT_ON_TV = 3;

/** Anti-spam: at most this many per window, per phone. */
export const REACTION_LIMIT = { count: 8, windowMs: 3000 } as const;
export const CHAT_LIMIT = { count: 5, windowMs: 10_000 } as const;

export interface PartyAuthor {
    deviceId: string;
    name: string;
    emoji: string;
    color: string;
}

export interface ChatMessage extends PartyAuthor {
    id: string;
    text: string;
    at: number;
}

export interface ReactionEvent {
    id: string;
    emoji: ReactionEmoji;
    from: PartyAuthor;
    /** Stage name of the person singing when the cheer was sent, if any. */
    toName: string | null;
}

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
    return typeof value === 'string' && (REACTION_EMOJIS as readonly string[]).includes(value);
}

/** One line of plain text: no control characters, single spaces, at most CHAT_MAX_LENGTH. */
export function cleanChatText(text: unknown): string {
    if (typeof text !== 'string') return '';
    return (
        text
            // eslint-disable-next-line no-control-regex
            .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2066-\u2069]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, CHAT_MAX_LENGTH)
    );
}

export function appendChat(
    chat: ChatMessage[] | undefined,
    message: ChatMessage,
    cap: number = CHAT_HISTORY,
): ChatMessage[] {
    return [...(chat ?? []), message].slice(-cap);
}

/** Keep only well-formed chat lines (for rooms read back from storage). */
export function normalizeChat(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter(
            (entry): entry is ChatMessage =>
                Boolean(entry) &&
                typeof entry === 'object' &&
                typeof entry.id === 'string' &&
                typeof entry.text === 'string' &&
                typeof entry.name === 'string' &&
                typeof entry.at === 'number',
        )
        .slice(-CHAT_HISTORY);
}

/** Sliding-window limiter: returns false when `key` is over the limit. */
export function createRateLimiter(limit: { count: number; windowMs: number }) {
    const hits = new Map<string, number[]>();
    return (key: string, now: number = Date.now()): boolean => {
        const recent = (hits.get(key) ?? []).filter((at) => now - at < limit.windowMs);
        if (recent.length >= limit.count) {
            hits.set(key, recent);
            return false;
        }
        recent.push(now);
        hits.set(key, recent);
        if (hits.size > 5000) {
            for (const [k, list] of hits) {
                if (list.every((at) => now - at >= limit.windowMs)) hits.delete(k);
            }
        }
        return true;
    };
}
