import { describe, expect, it } from 'vitest';

import { buildAgentInviteInstructions } from '@/lib/agent-invite-instructions';

const llmsTxtUrl = 'https://ahk.example/llms.txt';

describe('buildAgentInviteInstructions', () => {
    it('returns one Spanish line with llms.txt and room id', () => {
        const text = buildAgentInviteInstructions({ llmsTxtUrl, roomId: '2690', locale: 'es' });

        expect(text).toBe(
            'Lee https://ahk.example/llms.txt y entra a la sala 2690 para ayudarme a controlar la sala.',
        );
    });

    it('returns one English line with llms.txt and room id', () => {
        const text = buildAgentInviteInstructions({ llmsTxtUrl, roomId: '2690', locale: 'en' });

        expect(text).toBe(
            'Read https://ahk.example/llms.txt and join room 2690 to help me control the room.',
        );
    });

    it('includes password when the host has it', () => {
        expect(
            buildAgentInviteInstructions({
                llmsTxtUrl,
                roomId: '2690',
                locale: 'es',
                password: 'party',
            }),
        ).toBe(
            'Lee https://ahk.example/llms.txt y entra a la sala 2690 (contraseña: party) para ayudarme a controlar la sala.',
        );

        expect(
            buildAgentInviteInstructions({
                llmsTxtUrl,
                roomId: '2690',
                locale: 'en',
                password: 'party',
            }),
        ).toBe(
            'Read https://ahk.example/llms.txt and join room 2690 (password: party) to help me control the room.',
        );
    });

    it('includes joinToken when the room has no password', () => {
        expect(
            buildAgentInviteInstructions({
                llmsTxtUrl,
                roomId: '2690',
                locale: 'es',
                joinToken: 'tok_abc',
            }),
        ).toBe(
            'Lee https://ahk.example/llms.txt y entra a la sala 2690 (joinToken: tok_abc) para ayudarme a controlar la sala.',
        );
    });
});
