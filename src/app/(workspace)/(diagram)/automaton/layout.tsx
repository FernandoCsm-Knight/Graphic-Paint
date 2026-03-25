import type { ReactNode } from 'react';
import AutomatonProvider from '@/app/(workspace)/(diagram)/automaton/_context/providers/AutomatonProvider';

type AutomatonLayoutProps = {
    children: ReactNode;
};

export default function AutomatonLayout({ children }: AutomatonLayoutProps) {
    return <AutomatonProvider>{children}</AutomatonProvider>;
}
