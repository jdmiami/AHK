import { describe, expect, it } from 'vitest';

import {
    appendChat,
    CHAT_HISTORY,
    CHAT_MAX_LENGTH,
    cleanChatText,
    createRateLimiter,
    isReactionEmoji,
    normalizeChat,
    type ChatMessage,
} from '../src';

const line = (id: string): ChatMessage => ({
    id,
    deviceId: 'd',
    name: 'Ana',
    emoji: '🎤',
    color: '#FF2DAA',
    text: 'hi ' + id,
    at: 1,
});

describe('party chat', () => {
    it('cleans text to one safe line', () => {
        expect(cleanChatText('  hello \n\n  world\u0007 ')).toBe('hello world');
        expect(cleanChatText('a‮b')).toBe('a b');
        expect(cleanChatText(42)).toBe('');
        expect(cleanChatText('x'.repeat(500))).toHaveLength(CHAT_MAX_LENGTH);
    });

    it('keeps only the last lines', () => {
        let chat: ChatMessage[] | undefined;
        for (let i = 0; i < CHAT_HISTORY + 5; i++) chat = appendChat(chat, line(String(i)));
        expect(chat).toHaveLength(CHAT_HISTORY);
        expect(chat?.[0]?.id).toBe('5');
        expect(chat?.at(-1)?.id).toBe(String(CHAT_HISTORY + 4));
    });

    it('drops malformed stored lines', () => {
        expect(normalizeChat([line('a'), { id: 1 }, null, 'x'])).toEqual([line('a')]);
        expect(normalizeChat(undefined)).toEqual([]);
    });
});

describe('cheers', () => {
    it('accepts only the cheer emoji', () => {
        expect(isReactionEmoji('❤️')).toBe(true);
        expect(isReactionEmoji('💩')).toBe(false);
        expect(isReactionEmoji('<img>')).toBe(false);
    });

    it('rate-limits per phone in a sliding window', () => {
        const allow = createRateLimiter({ count: 2, windowMs: 1000 });
        expect(allow('a', 0)).toBe(true);
        expect(allow('a', 100)).toBe(true);
        expect(allow('a', 200)).toBe(false);
        expect(allow('b', 200)).toBe(true);
        expect(allow('a', 1100)).toBe(true);
    });
});
