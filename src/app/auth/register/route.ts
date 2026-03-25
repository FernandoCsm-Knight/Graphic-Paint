import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeNextPath, signUpSchema } from '@/lib/auth/validation';
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

    const parsed = signUpSchema.safeParse(payload);
    if (!parsed.success) {
        return jsonResponse({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, 400);
    }

    const nextPath = sanitizeNextPath(
        typeof payload === 'object' && payload !== null && 'next' in payload ? String(payload.next ?? '') : null,
        '/dashboard'
    );

    const emailRedirectTo = new URL('/auth/confirm', request.url);
    emailRedirectTo.searchParams.set('next', nextPath);

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
        ...parsed.data,
        options: {
            emailRedirectTo: emailRedirectTo.toString(),
        },
    });

    if (error) {
        return jsonResponse({ error: error.message }, 400);
    }

    if (data.session) {
        return jsonResponse({ redirectTo: nextPath });
    }

    return jsonResponse({ success: true });
}
