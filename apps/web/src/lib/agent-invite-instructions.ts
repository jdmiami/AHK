import type { AppLocale } from '@/lib/locale-path';

export type AgentInviteInstructionsInput = {
    llmsTxtUrl: string;
    roomId: string;
    locale: AppLocale;
    /** When the host knows the room password (same source as share URL). */
    password?: string;
    /** Capability for passwordless rooms (HTTP session). Not used on QR. */
    joinToken?: string;
};

export function buildAgentInviteInstructions(input: AgentInviteInstructionsInput): string {
    const { llmsTxtUrl, roomId, locale, password, joinToken } = input;
    const trimmedPassword = password?.trim();
    const trimmedToken = joinToken?.trim();

    const secret =
        trimmedPassword != null && trimmedPassword.length > 0
            ? locale === 'es'
                ? ` (contraseña: ${trimmedPassword})`
                : ` (password: ${trimmedPassword})`
            : trimmedToken
              ? ` (joinToken: ${trimmedToken})`
              : '';

    if (locale === 'es') {
        return `Lee ${llmsTxtUrl} y entra a la sala ${roomId}${secret} para ayudarme a controlar la sala.`;
    }

    return `Read ${llmsTxtUrl} and join room ${roomId}${secret} to help me control the room.`;
}
