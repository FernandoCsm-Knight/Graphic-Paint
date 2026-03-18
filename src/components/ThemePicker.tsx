import { useContext } from 'react';
import { LuPalette } from 'react-icons/lu';
import { ThemeContext } from '../theme/ThemeContext';
import { darkPalettes, lightPalettes, highContrastPalettes, type AppPalette } from '../theme/palettes';

type ThemePickerProps = {
    isCollapsed: boolean;
};

const CATEGORIES = [
    { label: 'Dark', short: 'D', palettes: darkPalettes },
    { label: 'Light', short: 'L', palettes: lightPalettes },
    { label: 'HC', short: 'HC', palettes: highContrastPalettes },
];

const Swatch = ({
    palette,
    isActive,
    onClick,
}: {
    palette: AppPalette;
    isActive: boolean;
    onClick: () => void;
}) => (
    <button
        title={palette.name}
        onClick={onClick}
        className={`h-5 w-5 hover:cursor-pointer shrink-0 rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none ${
            isActive ? 'scale-110 ring-2 ring-offset-1' : ''
        }`}
        style={{
            background: `linear-gradient(135deg, ${palette.preview.bg} 50%, ${palette.preview.accent} 50%)`,
            ...(isActive
                ? {
                    outline: `2px solid ${palette.preview.accent}`,
                    outlineOffset: '2px',
                  }
                : {
                    outline: `1px solid black`,
                }),
        }}
    />
);

const ThemePicker = ({ isCollapsed }: ThemePickerProps) => {
    const theme = useContext(ThemeContext);
    if (!theme) {
        throw new Error('ThemePicker must be used inside ThemeProvider');
    }

    const { palette: activePalette, setActivePalette } = theme;

    if (isCollapsed) {
        return (
            <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--app-sidebar-border)] bg-[var(--app-sidebar-surface)] px-0 py-3 flex flex-col items-center gap-2">
                <LuPalette className="h-4 w-4" style={{ color: 'var(--app-sidebar-text-muted)' }} />
                <div
                    className="h-4 w-4 rounded-full ring-1"
                    style={{
                        background: `linear-gradient(135deg, ${activePalette.preview.bg} 50%, ${activePalette.preview.accent} 50%)`,
                        outline: `1.5px solid ${activePalette.preview.accent}`,
                        outlineOffset: '1px',
                    }}
                    title={activePalette.name}
                />
            </div>
        );
    }

    return (
        <div
            className="border-t px-4 py-3"
            style={{
                borderColor: 'var(--app-sidebar-border)',
                background: 'var(--app-sidebar-surface)',
                backdropFilter: 'blur(16px)',
            }}
        >
            <div className="mb-2.5 flex items-center gap-1.5">
                <LuPalette className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--app-sidebar-text-muted)' }} />
                <span
                    className="text-xs font-semibold uppercase tracking-[0.28em]"
                    style={{ color: 'var(--app-sidebar-text-muted)' }}
                >
                    Theme
                </span>
            </div>

            <div className="space-y-2.5">
                {CATEGORIES.map(({ label, palettes }) => (
                    <div key={label} className="flex items-center justify-center">
                        <span
                            className="w-10 text-[10px] font-semibold uppercase tracking-[0.18em]"
                            style={{ color: 'var(--app-sidebar-text-muted)' }}
                        >
                            {label}
                        </span>
                        <div className="flex grow justify-evenly items-center">
                            {palettes.map((p) => (
                                <Swatch
                                    key={p.id}
                                    palette={p}
                                    isActive={p.id === activePalette.id}
                                    onClick={() => setActivePalette(p)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ThemePicker;
