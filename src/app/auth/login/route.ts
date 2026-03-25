import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeNextPath, signInSchema } from '@/lib/auth/validation';
import { createClient } from '@/lib/supabase/server';

function jsonResponse(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}

function isAllowedOrigin(request: NextRequest) {
    const origin = request.headers.get('origin');
    return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
    if (!isAllowedOrigin(request)) {
        return jsonResponse({ error: 'Origem da requisicao invalida.' }, 403);
    }

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse({ error: 'Requisicao invalida.' }, 400);
    }

    const parsed = signInSchema.safeParse(payload);
    if (!parsed.success) {
        return jsonResponse({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, 400);
    }

    const nextPath = sanitizeNextPath(
        typeof payload === 'object' && payload !== null && 'next' in payload ? String(payload.next ?? '') : null,
        '/dashboard'
    );

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
        return jsonResponse({ error: 'E-mail ou senha invalidos.' }, 401);
    }

    return jsonResponse({ redirectTo: nextPath });
}
