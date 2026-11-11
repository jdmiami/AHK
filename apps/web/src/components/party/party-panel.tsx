'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { CHAT_MAX_LENGTH, REACTION_EMOJIS, type ReactionEmoji } from '@vkara/room';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SingerChip } from '@/components/singer/singer-chip';
import { usePartySeenStore, useRoomChat } from '@/hooks/use-party';
import { useMySinger } from '@/hooks/use-singer';
import { useRoomLineup } from '@/hooks/use-room-lineup';
import { REMOTE_CHROME_CSS_VARS } from '@/lib/remote-chrome';
import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { useWebSocket } from '@/providers/websocket-provider';

type Pop = { key: number; emoji: string; left: number };

/** Party tab: cheer the singer (emoji pop on the big screen) and the room chat. */
export function PartyPanel() {
    return (
        <div
            className="flex h-full min-h-0 flex-col"
            // Keep the message box above the now-playing bar.
            style={{ paddingBottom: `var(${REMOTE_CHROME_CSS_VARS.insetBottom}, 0px)` }}
        >
            <CheerPad />
            <PartyChat />
        </div>
    );
}

function CheerPad() {
    const t = useScopedI18n('party');
    const { now } = useRoomLineup();
    const { ensureConnectedAndSend } = useWebSocket();
    const [pops, setPops] = useState<Pop[]>([]);
    const nextKey = useRef(0);

    const cheer = (emoji: ReactionEmoji) => {
        ensureConnectedAndSend({ type: 'sendReaction', emoji });
        const pop = { key: nextKey.current++, emoji, left: 10 + Math.random() * 80 };
        setPops((list) => [...list.slice(-11), pop]);
        setTimeout(() => setPops((list) => list.filter((p) => p.key !== pop.key)), 1300);
    };

    return (
        <section
            className="relative mx-page-gutter mt-2 rounded-2xl border bg-card/60 p-3"
            aria-label={t('cheerTitle')}
        >
            <div className="mb-2 flex min-w-0 items-center gap-2 text-sm font-medium">
                {now?.singer ? (
                    <>
                        <span className="shrink-0">{t('cheerFor')}</span>
                        <SingerChip singer={now.singer} size="md" />
                    </>
                ) : (
                    <span>{t('cheerNobody')}</span>
                )}
            </div>
            <div className="grid grid-cols-4 gap-2">
                {REACTION_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        type="button"
                        onClick={() => cheer(emoji)}
                        className="ahk-press flex h-14 items-center justify-center rounded-2xl border bg-background/60 text-3xl"
                        aria-label={t('sendCheer', { emoji })}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t('cheerHint')}</p>
            <div
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                aria-hidden
            >
                {pops.map((pop) => (
                    <span
                        key={pop.key}
                        className="ahk-pop-emoji absolute bottom-2 text-3xl"
                        style={
                            { left: `${pop.left}%`, '--ahk-drift': '0px' } as React.CSSProperties
                        }
                    >
                        {pop.emoji}
                    </span>
                ))}
            </div>
        </section>
    );
}

function PartyChat() {
    const t = useScopedI18n('party');
    const chat = useRoomChat();
    const { myId, isController } = useMySinger();
    const { ensureConnectedAndSend } = useWebSocket();
    const setSeen = usePartySeenStore((s) => s.setSeen);
    const [draft, setDraft] = useState('');
    const listRef = useRef<HTMLOListElement | null>(null);
    const stickToBottom = useRef(true);

    // Everything on screen counts as read while this tab is open.
    useEffect(() => {
        setSeen(chat.at(-1)?.id ?? null);
    }, [chat, setSeen]);

    useLayoutEffect(() => {
        const list = listRef.current;
        if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
    }, [chat]);

    const send = () => {
        const text = draft.trim();
        if (!text) return;
        ensureConnectedAndSend({ type: 'sendChat', text });
        setDraft('');
        stickToBottom.current = true;
    };

    return (
        <section className="mt-3 flex min-h-0 flex-1 flex-col" aria-label={t('chatTitle')}>
            <div className="mx-page-gutter mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t('chatTitle')}</h2>
                {isController && chat.length > 0 ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => ensureConnectedAndSend({ type: 'clearChat' })}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('clearChat')}
                    </Button>
                ) : null}
            </div>
            <ol
                ref={listRef}
                onScroll={(event) => {
                    const el = event.currentTarget;
                    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
                }}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-page-gutter py-2"
                aria-live="polite"
            >
                {chat.length === 0 ? (
                    <li className="py-8 text-center text-sm text-muted-foreground">
                        {t('chatEmpty')}
                    </li>
                ) : (
                    chat.map((line) => {
                        const mine = line.deviceId === myId;
                        return (
                            <li key={line.id} className={cn('flex', mine && 'justify-end')}>
                                <div
                                    className={cn(
                                        'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                                        mine ? 'bg-primary/15' : 'bg-muted',
                                    )}
                                >
                                    <p
                                        className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold"
                                        style={{ color: line.color }}
                                    >
                                        <span aria-hidden>{line.emoji}</span>
                                        {mine ? t('you') : line.name}
                                        <time
                                            className="ml-1 font-normal text-muted-foreground"
                                            dateTime={new Date(line.at).toISOString()}
                                        >
                                            {new Date(line.at).toLocaleTimeString([], {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                        </time>
                                    </p>
                                    <p className="break-words">{line.text}</p>
                                </div>
                            </li>
                        );
                    })
                )}
            </ol>
            <form
                className="mx-page-gutter mb-2 mt-1 flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    send();
                }}
            >
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, CHAT_MAX_LENGTH))}
                    placeholder={t('chatPlaceholder')}
                    aria-label={t('chatPlaceholder')}
                    maxLength={CHAT_MAX_LENGTH}
                    enterKeyHint="send"
                    className="min-h-11 text-base sm:text-sm"
                />
                <Button
                    type="submit"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    disabled={!draft.trim()}
                    aria-label={t('send')}
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </section>
    );
}
