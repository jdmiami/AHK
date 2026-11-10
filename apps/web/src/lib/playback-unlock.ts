/**
 * Browsers only autoplay video with sound after someone has clicked or pressed a key on the
 * page. The big screen (`/tv`) hides YouTube's controls and blocks clicks on the video, so a
 * blocked autoplay leaves a frozen first frame with nothing to press. These helpers decide when
 * to offer a full-screen "Click to start" instead.
 */

/** How long a new song may sit unstarted before we offer the click. */
export const TAP_TO_START_AFTER_MS = 4_000;

export function hasUserActivation(): boolean {
    if (typeof navigator === 'undefined') return false;
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
        .userActivation;
    return Boolean(activation?.hasBeenActive);
}

export type TapToStartInput = {
    /** The current song reached PLAYING at least once on this device. */
    hasPlayed: boolean;
    /** The room asked this song to play at some point since it loaded. */
    roomWantedPlay: boolean;
    /** YouTube fired `onAutoplayBlocked` for the current song. */
    autoplayBlocked: boolean;
    /** The host already pressed "Click to start" for this song. */
    dismissed: boolean;
    /** Time since the current song was loaded. */
    elapsedMs: number;
};

/**
 * Offer "Click to start" when a song that should be playing has not started on this screen.
 * A blocked autoplay also makes the big screen report "paused" to the room, which is why this
 * looks at whether the room ever wanted play, not at the current room state.
 */
export function shouldOfferTapToStart(input: TapToStartInput): boolean {
    if (input.hasPlayed || input.dismissed) return false;
    if (input.autoplayBlocked) return true;
    return input.roomWantedPlay && input.elapsedMs >= TAP_TO_START_AFTER_MS;
}
