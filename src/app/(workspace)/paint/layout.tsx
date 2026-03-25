import type { ReactNode } from 'react';
import PaintProvider from '@/app/(workspace)/paint/_context/providers/PaintProvider';
import ReplacementProvider from '@/app/(workspace)/paint/_context/providers/ReplacementProvider';
import SettingsProvider from '@/app/(workspace)/paint/_context/providers/SettingsProvider';

type PaintLayoutProps = {
    children: ReactNode;
};

export default function PaintLayout({ children }: PaintLayoutProps) {
    return (
        <PaintProvider>
            <ReplacementProvider>
                <SettingsProvider>{children}</SettingsProvider>
            </ReplacementProvider>
        </PaintProvider>
    );
}
