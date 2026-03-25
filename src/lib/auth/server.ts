import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const getServerAuth = cache(async () => {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    return { supabase, user, error };
});

export async function requireUser() {
    const session = await getServerAuth();
    if (!session.user) redirect('/login');
    return {
        ...session,
        user: session.user,
    };
}

export async function redirectAuthenticatedUser(destination = '/dashboard') {
    const session = await getServerAuth();
    if (session.user) redirect(destination);
}

export async function getRequestOrigin(): Promise<string> {
    const headerStore = await headers();
    const origin = headerStore.get('origin');
    if (origin) return origin;

    const protocol = headerStore.get('x-forwarded-proto') ?? 'http';
    const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost:3000';
    return `${protocol}://${host}`;
}
