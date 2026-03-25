import type { ReactNode } from 'react';
import GraphProvider from '@/app/(workspace)/(diagram)/graph/_context/providers/GraphProvider';

type GraphLayoutProps = {
    children: ReactNode;
};

export default function GraphLayout({ children }: GraphLayoutProps) {
    return <GraphProvider>{children}</GraphProvider>;
}
