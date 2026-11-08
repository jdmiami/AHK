import { createI18nMiddleware } from 'next-international/middleware';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

import { env } from '@/env';
import { APP_LOCALES, DEFAULT_APP_LOCALE, LOCALE_COOKIE_NAME } from '@/lib/locale-path';

const I18nMiddleware = createI18nMiddleware({
    defaultLocale: DEFAULT_APP_LOCALE,
    locales: [...APP_LOCALES],
    urlMappingStrategy: 'rewrite',
    resolveLocaleFromRequest: () => DEFAULT_APP_LOCALE,
});

/**
 * Default locale (en) is served at `/` with no prefix.
 * Spanish is at `/es`. Legacy `/en` URLs (and upstream's `/vi`) redirect to `/`.
 *
 * Skip redirect on internal Next.js subrequests (RSC, prefetch, middleware rewrite).
 * AIO image also handles the legacy prefixes at the Caddy edge.
 */
function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isInternalSubrequest =
        request.headers.has('rsc') ||
        request.headers.get('purpose') === 'prefetch' ||
        request.headers.has('x-middleware-subrequest');

    if (
        env.VKARA_AIO !== '1' &&
        !isInternalSubrequest &&
        (pathname === '/en' ||
            pathname.startsWith('/en/') ||
            pathname === '/vi' ||
            pathname.startsWith('/vi/'))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.slice(3) || '/';
        const response = NextResponse.redirect(url, 301);
        response.cookies.set(LOCALE_COOKIE_NAME, DEFAULT_APP_LOCALE, {
            sameSite: 'strict',
            path: '/',
        });
        return response;
    }

    // Default locale (en) Smart TV display at `/tv` without locale prefix.
    if (pathname === '/tv' || pathname.startsWith('/tv/')) {
        const url = request.nextUrl.clone();
        url.pathname = `/${DEFAULT_APP_LOCALE}${pathname}`;
        const response = NextResponse.rewrite(url);
        response.cookies.set(LOCALE_COOKIE_NAME, DEFAULT_APP_LOCALE, {
            sameSite: 'strict',
            path: '/',
        });
        return response;
    }

    const localeSegment = pathname.split('/').filter(Boolean)[0];
    if (localeSegment === 'es') {
        const response = NextResponse.next();
        response.cookies.set(LOCALE_COOKIE_NAME, 'es', { sameSite: 'strict', path: '/' });
        return response;
    }

    const response = I18nMiddleware(request);

    if (pathname === '/') {
        response.cookies.set(LOCALE_COOKIE_NAME, DEFAULT_APP_LOCALE, {
            sameSite: 'strict',
            path: '/',
        });
    }

    return response;
}

export default Sentry.wrapMiddlewareWithSentry(middleware);

export const config = {
    matcher: ['/((?!api|static|monitoring|.*\\..*|_next|favicon.ico|robots.txt|llms.txt|icons).*)'],
};
