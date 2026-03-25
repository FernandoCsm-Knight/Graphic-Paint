import type { ReactNode } from 'react';
import { redirectAuthenticatedUser } from '@/lib/auth/server';

export default async function AuthLayout({ children }: { children: ReactNode }) {
    await redirectAuthenticatedUser();

    return (
        <div
            className="min-h-full px-4 py-6 md:px-6 md:py-8"
            style={{
                background: `
                    radial-gradient(circle at 10% 15%, color-mix(in srgb, var(--app-accent-soft-strong) 38%, transparent) 0%, transparent 28%),
                    radial-gradient(circle at 88% 8%, color-mix(in srgb, var(--app-status-available-bg) 24%, transparent) 0%, transparent 24%),
                    radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--app-accent-soft) 32%, transparent) 0%, transparent 36%),
                    linear-gradient(180deg, color-mix(in srgb, var(--app-sidebar-surface) 92%, transparent), transparent 30%),
                    var(--app-body-accent-primary)
                `,
            }}
        >
            <div className="flex min-h-[calc(100vh-3rem)] items-center">
                {children}
            </div>
        </div>
    );
}
