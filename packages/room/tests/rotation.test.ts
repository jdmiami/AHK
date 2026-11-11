import { describe, expect, it } from 'vitest';

import {
    applyRotation,
    canControlPlayback,
    canEditQueuedSong,
    createSinger,
    ensureSinger,
    HOUSE_SINGER_ID,
    isRoomController,
    orderByRotation,
    roomLineup,
    singerStanding,
    skipSingerTurn,
} from '../src';
import type { Participant, Singer } from '../src';
import type { YouTubeVideo } from '@vkara/youtube';

const song = (id: string, singerId?: string) => ({ id, singerId }) as unknown as YouTubeVideo;
const ids = (list: YouTubeVideo[]) => list.map((v) => v.id);

function singers(entries: Array<[string, Partial<Singer>]>): Record<string, Singer> {
    return Object.fromEntries(
        entries.map(([id, patch]) => [id, { ...createSinger(id, 0), ...patch }]),
    );
}

describe('orderByRotation (fairness first)', () => {
    it('takes one song per singer per round, longest wait first', () => {
        const s = singers([
            ['ana', { joinedAt: 100, lastSangAt: 500 }],
            ['ben', { joinedAt: 200, lastSangAt: null }], // waiting since 200
            ['cy', { joinedAt: 50, lastSangAt: 300 }], // waiting since 300
        ]);
        const queue = [
            song('a1', 'ana'),
            song('a2', 'ana'),
            song('b1', 'ben'),
            song('c1', 'cy'),
            song('c2', 'cy'),
        ];
        expect(ids(orderByRotation(queue, s))).toEqual(['b1', 'c1', 'a1', 'c2', 'a2']);
    });

    it('keeps house songs (TV / agents) at the front of each round', () => {
        const s = singers([['ana', { joinedAt: 1 }]]);
        const queue = [song('a1', 'ana'), song('h1'), song('h2')];
        expect(ids(orderByRotation(queue, s))).toEqual(['h1', 'a1', 'h2']);
    });
});

describe('applyRotation', () => {
    it('marks a newly started song as sung and sends that singer to the back', () => {
        const room = {
            playingNow: song('a1', 'ana'),
            videoQueue: [song('a2', 'ana'), song('b1', 'ben')],
            singers: singers([
                ['ana', { joinedAt: 1 }],
                ['ben', { joinedAt: 2 }],
            ]),
        };
        applyRotation(room, 1_000, null);
        expect(room.singers.ana!.lastSangAt).toBe(1_000);
        expect(room.singers.ana!.songsSung).toBe(1);
        expect(ids(room.videoQueue)).toEqual(['b1', 'a2']);
        // Same song still playing: not counted twice.
        applyRotation(room, 2_000, 'a1');
        expect(room.singers.ana!.songsSung).toBe(1);
    });

    it('parks a paused singer’s songs and brings them back on return', () => {
        const room = {
            playingNow: null,
            videoQueue: [song('a1', 'ana'), song('b1', 'ben'), song('a2', 'ana')],
            singers: singers([
                ['ana', { joinedAt: 1, paused: true }],
                ['ben', { joinedAt: 2 }],
            ]),
        };
        applyRotation(room, 10, null);
        expect(ids(room.videoQueue)).toEqual(['b1']);
        expect(ids(room.singers.ana!.parked)).toEqual(['a1', 'a2']);
        room.singers.ana!.paused = false;
        applyRotation(room, 20, null);
        expect(ids(room.videoQueue)).toEqual(['a1', 'b1', 'a2']);
        expect(room.singers.ana!.parked).toEqual([]);
    });

    it('skip my turn moves the singer behind everyone waiting', () => {
        const room = {
            playingNow: null,
            videoQueue: [song('a1', 'ana'), song('b1', 'ben')],
            singers: singers([
                ['ana', { joinedAt: 1 }],
                ['ben', { joinedAt: 2 }],
            ]),
        };
        applyRotation(room, 10, null);
        expect(ids(room.videoQueue)).toEqual(['a1', 'b1']);
        skipSingerTurn(room.singers.ana!, 50);
        applyRotation(room, 50, null);
        expect(ids(room.videoQueue)).toEqual(['b1', 'a1']);
    });

    it('leaves rooms without singers untouched', () => {
        const room = { playingNow: null, videoQueue: [song('x'), song('y')] };
        applyRotation(room, 1, null);
        expect(ids(room.videoQueue)).toEqual(['x', 'y']);
    });
});

describe('fairness with join times', () => {
    it('a singer who already sang goes behind people who joined earlier but have not sung', () => {
        // Ana joined first and sang at t=300; Ben and Cy joined at 100/200 and only queued later.
        const s = singers([
            ['ana', { joinedAt: 10, lastSangAt: 300 }],
            ['ben', { joinedAt: 100 }],
            ['cy', { joinedAt: 200 }],
        ]);
        const queue = [song('a2', 'ana'), song('b1', 'ben'), song('c1', 'cy'), song('c2', 'cy')];
        expect(ids(orderByRotation(queue, s))).toEqual(['b1', 'c1', 'a2', 'c2']);
        expect(ensureSinger({}, 'dan', 999, { joinedAt: 42 }).joinedAt).toBe(42);
    });
});

describe('the person singing waits last', () => {
    it('someone who joins mid-song goes before the singer’s next song', () => {
        // Ana started singing at t=300; Ben joined at t=400 while she was still singing.
        const room = {
            playingNow: song('a1', 'ana'),
            videoQueue: [song('a2', 'ana'), song('b1', 'ben')],
            singers: singers([
                ['ana', { joinedAt: 10, lastSangAt: 300, songsSung: 1 }],
                ['ben', { joinedAt: 400 }],
            ]),
        };
        applyRotation(room, 450, 'a1', 'ana');
        expect(ids(room.videoQueue)).toEqual(['b1', 'a2']);
        // Ana's song ends at t=500 and Ben starts: Ana's wait restarts at 500.
        room.playingNow = room.videoQueue.shift()!;
        applyRotation(room, 500, 'a1', 'ana');
        expect(room.singers.ana!.lastSangAt).toBe(500);
        expect(room.singers.ben!.songsSung).toBe(1);
        expect(ids(room.videoQueue)).toEqual(['a2']);
    });
});

describe('singers and standing', () => {
    it('creates a singer once with a stable look', () => {
        const room: { singers?: Record<string, Singer> } = {};
        const first = ensureSinger(room, 'dev-1', 5, { stageName: '  Velvet   Falcon ' });
        expect(first.stageName).toBe('Velvet Falcon');
        expect(ensureSinger(room, 'dev-1', 9)).toBe(first);
        expect(first.emoji).toBeTruthy();
        expect(first.color).toMatch(/^#/);
    });

    it('reports position, count and whether they are singing', () => {
        const room = {
            playingNow: song('b0', 'ben'),
            videoQueue: [song('c1', 'cy'), song('a1', 'ana'), song('a2', 'ana')],
            singers: singers([['ana', { parked: [song('a3', 'ana')] }]]),
        };
        expect(singerStanding(room, 'ana')).toEqual({
            position: 2,
            queuedCount: 3,
            isSinging: false,
        });
        expect(singerStanding(room, 'ben')).toEqual({
            position: null,
            queuedCount: 0,
            isSinging: true,
        });
    });
});

describe('permissions', () => {
    const member = (deviceId: string, extra: Partial<Participant> = {}) =>
        ({
            deviceId,
            displayName: deviceId,
            role: 'member',
            joinedAt: 0,
            lastSeen: 0,
            connectionIds: [],
            isTvConnection: false,
            isAgent: false,
            ...extra,
        }) as Participant;
    const room = {
        hostDeviceId: 'host',
        playingNow: song('b0', 'ben'),
        videoQueue: [song('a1', 'ana'), song('h1')],
        participants: {
            host: member('host', { role: 'host' }),
            tv: member('tv', { isTvConnection: true }),
            ana: member('ana'),
            ben: member('ben'),
        },
    };

    it('host and TV run the room', () => {
        expect(isRoomController(room, 'host')).toBe(true);
        expect(isRoomController(room, 'tv')).toBe(true);
        expect(isRoomController(room, 'ana')).toBe(false);
        expect(isRoomController(room, null)).toBe(false);
    });

    it('only the host or the person singing controls playback', () => {
        expect(canControlPlayback(room, 'ben')).toBe(true);
        expect(canControlPlayback(room, 'ana')).toBe(false);
        expect(canControlPlayback(room, 'host')).toBe(true);
    });

    it('singers edit only their own queued songs', () => {
        expect(canEditQueuedSong(room, 'ana', 'a1')).toBe(true);
        expect(canEditQueuedSong(room, 'ben', 'a1')).toBe(false);
        expect(canEditQueuedSong(room, 'ana', 'h1')).toBe(false);
        expect(canEditQueuedSong(room, 'host', 'h1')).toBe(true);
        expect(HOUSE_SINGER_ID).toBe('__house');
    });
});

describe('roomLineup', () => {
    it('shows who is singing, the numbered queue and who is sitting out', () => {
        const s = singers([
            ['ana', { stageName: 'Ana', joinedAt: 1 }],
            ['ben', { stageName: 'Ben', joinedAt: 2 }],
            ['cy', { stageName: 'Cy', joinedAt: 3, paused: true, parked: [song('c1', 'cy')] }],
            ['dee', { stageName: 'Dee', joinedAt: 0, paused: true }],
        ]);
        const lineup = roomLineup({
            playingNow: song('a1', 'ana'),
            videoQueue: [song('h1'), song('b1', 'ben'), song('a2', 'ana')],
            singers: s,
        });
        expect(lineup.now?.singer?.stageName).toBe('Ana');
        expect(
            lineup.upcoming.map((e) => [e.position, e.video.id, e.singer?.stageName ?? null]),
        ).toEqual([
            [1, 'h1', null],
            [2, 'b1', 'Ben'],
            [3, 'a2', 'Ana'],
        ]);
        expect(lineup.sittingOut.map((e) => [e.singer.stageName, e.songs])).toEqual([
            ['Dee', 0],
            ['Cy', 1],
        ]);
    });

    it('is empty for an idle room', () => {
        expect(roomLineup({ playingNow: null, videoQueue: [] })).toEqual({
            now: null,
            upcoming: [],
            sittingOut: [],
        });
    });
});
