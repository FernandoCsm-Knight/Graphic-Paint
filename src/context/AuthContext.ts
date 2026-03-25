import { createContext, useContext } from 'react';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/db.types';

export type AuthContextValue = {
    supabase: SupabaseClient<Database>;
    user: User | null;
    session: Session | null;
    loading: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
