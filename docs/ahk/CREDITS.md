# Credits

AHK · Artist House Karaoke is a fork of **[vkara](https://github.com/lehuygiang28/vkara)** by
[Lê Huy Giang (@lehuygiang28)](https://github.com/lehuygiang28), released under the MIT License.
The room/WebSocket engine, YouTube integration, phone-remote UI, and TV layout all originate there.
Thank you.

The original MIT copyright notice is preserved in [`LICENSE`](../../LICENSE), as the license requires.

## Libraries

| Library | Author | Used for |
| --- | --- | --- |
| [youtubei](https://github.com/SuspiciousLookingOwl/youtubei) | [@SuspiciousLookingOwl](https://github.com/SuspiciousLookingOwl) | Search, video metadata, playlists, Innertube API |
| [youtube-sr](https://github.com/twlite/youtube-sr) | [@twlite](https://github.com/twlite) | Search suggestions |
| [react-youtube](https://github.com/tjallingt/react-youtube) | [@tjallingt](https://github.com/tjallingt) | YouTube player embed in the web app |
| [Next.js](https://nextjs.org), [Elysia](https://elysiajs.com), [Bun](https://bun.sh), [Tailwind CSS](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com), [zustand](https://github.com/pmndrs/zustand), [zod](https://zod.dev) | their maintainers | Framework and tooling |

## What AHK removed from upstream

- Samsung Tizen and Android TV wrapper apps (AHK is browser-first; TVs open the `/tv` URL).
- Vietnamese locale (AHK ships English and Spanish).
- Upstream deployment identifiers (Sentry org, Docker Hub owner, funding links).
