# Tempo and key (advanced tools)

Decisions (owner, Nov 2026): tempo slider only for time tools; key changer = **both** the
key-version finder and an opt-in real pitch shift on the projector laptop; everyone in the
room can use them; settings reset when the next song starts.

## How it works

| Piece | Where | Notes |
|-------|-------|-------|
| Room state | `packages/room/src/song-adjust.ts` | `songAdjust = { videoId, rate, semitones }`. Values apply only while `videoId` is the playing song, so every song change resets them (no matter which code path changed the song). Tempo 0.5–1.5× in 0.05 steps; key −6…+6. |
| Messages | `packages/validators` | `setTempo`, `setKey` (both carry `videoId`; stale taps are ignored), `setKeyEngineActive`. |
| Server | `apps/api/.../room-service.ts` | Stores and broadcasts. `utils/room-lock.ts` serializes mutations per room so simultaneous updates (a phone's key + the TV's engine status) are not lost. |
| Tempo on the TV | `hooks/use-apply-song-tempo.ts` | `YT.Player.setPlaybackRate` (YouTube keeps the pitch). Phones' progress bar runs at the same rate. |
| Phone UI | `song-adjust-sheet.tsx` | "Tempo · Key" chips under the transport → sheet with slider, key stepper, engine status, key-version finder. |
| Key-version finder | `lib/key-versions.ts` | Searches "<song> karaoke lower/higher/female/male key", ranks key-labelled uploads first, drops videos the server reports as not embeddable, swaps in with Play now. Stays within YouTube's rules. |
| Real pitch shift | `public/key-engine.html`, `public/worklets/ahk-pitch-shifter.js` | Opt-in, projector laptop only (desktop Chrome/Edge). The big screen shows "Key changer: click to turn on" when a phone picks a key ≠ 0. A small window captures the big-screen tab's audio (`suppressLocalAudioPlayback` mutes the original), shifts it in an AudioWorklet (dual delay-line, ~60 ms window), and plays it. Talks to the big-screen tab over `BroadcastChannel('ahk-key-engine')`. |

**YouTube terms:** altering the audio of YouTube content is against the YouTube API Services
policies. The owner chose to ship the opt-in pitch shift anyway; it runs only on the host's
laptop after an explicit click and share prompt. The key-version finder is the compliant path.

## Deploying server changes without a new image

The RunPod pod runs the published `vkara-api-redis` image. `containers/api-redis/run-from-source.sh`
downloads this repo at `AHK_SOURCE_REF`, reuses the image's installed dependencies, and runs the
API from source (`bun run`). If the download fails, the image's compiled server runs instead.
Pod start command (watchdog included):

```sh
wget -qO /tmp/ahk-boot.sh "https://raw.githubusercontent.com/jdmiami/AHK/${AHK_SOURCE_REF}/containers/api-redis/run-from-source.sh" \
  && sh /tmp/ahk-boot.sh; \
  [ -f /tmp/ahk-src/containers/api-redis/idle-watchdog.sh ] && (sh /tmp/ahk-src/containers/api-redis/idle-watchdog.sh &); \
  exec /app/entrypoint.sh
```

Valid only while `bun.lock` and the API packages' dependencies match the image (true for
`sha-b2494a1`); add dependencies → publish a new image.

## Verified

- Worklet: 440 Hz → 522 Hz at +3 (target 523), 393 Hz at −2 (target 392), headed Chromium with real tab capture.
- Phone → server → TV: TV YouTube player reported 1 → 0.95 → … → 0.75; launcher appeared at key +2; song change reset to 1× and hid the launcher.
- API from source inside the real image: tempo/key stored, stale video ignored, simultaneous messages all kept (3/3).

Not verified here: that `suppressLocalAudioPlayback` silences the original audio on real
speakers (no audio device in CI), and real-device YouTube playback.
