import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/theme/ThemeContext';

export const metadata: Metadata = {
    title: 'Graphic Paint',
    description: 'Graphics workspace — Paint, Graph and Automaton modules',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="h-full">
            <body className="scrollbar h-full">
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
