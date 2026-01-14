import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_ENABLED } from './lib/config'
import { getToken } from 'next-auth/jwt'

// Protect:
// - /app/* (redirect to / if unauthenticated)
// - /api/* (401 JSON if unauthenticated)
// Except:
// - /api/auth/*
// - /api/env-check
export default async function middleware(req: NextRequest) {
    if (!AUTH_ENABLED) {
        return NextResponse.next()
    }

    const path = req.nextUrl.pathname

    // Public endpoints
    if (path.startsWith('/api/auth/')) {
        return NextResponse.next()
    }
    if (path === '/api/env-check') {
        return NextResponse.next()
    }

    // Only protect /app/* and /api/*
    const isApp = path.startsWith('/app/')
    const isApi = path.startsWith('/api/')
    if (!isApp && !isApi) {
        return NextResponse.next()
    }

    try {
        const token = await getToken({ req })
        if (token) {
            return NextResponse.next()
        }

        if (isApi) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // isApp
        const url = req.nextUrl.clone()
        url.pathname = '/'
        url.searchParams.set('callbackUrl', path)
        return NextResponse.redirect(url)
    } catch {
        // If auth config is broken (missing env), don't hard-crash middleware.
        // Allow request to proceed so UI/handlers can show a helpful message.
        return NextResponse.next()
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
