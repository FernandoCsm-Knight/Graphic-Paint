export interface MenuSegment {
    label: string;
    active: boolean;
    onClick: () => void;
}

export interface MenuTitleCardProps {
    title: string;
    subtitle?: string;
    badge: string;
    segments: [MenuSegment, MenuSegment];
}

const MenuTitleCard = ({ title, subtitle, badge, segments }: MenuTitleCardProps) => (
    <div className="ui-menu-title-card flex min-w-0 flex-col gap-[var(--pm-gap)] rounded-xl px-[var(--pm-pad)] py-[var(--pm-btn-pad)] shadow-sm">
        <div className="flex items-center justify-between gap-[var(--pm-gap)]">
            <div>
                <h1 className="text-sm sm:text-base md:text-lg ui-menu-title-heading font-bold uppercase tracking-[0.24em]">
                    {title}
                </h1>
                {subtitle && <p className="ui-panel-muted mt-0.5 text-xs">{subtitle}</p>}
            </div>
            <span className="ui-menu-title-badge rounded-full px-[var(--pm-btn-pad)] py-0.5 text-xs font-semibold uppercase tracking-[0.18em]">
                {badge}
            </span>
        </div>

        <div className="ui-menu-segmented flex items-center gap-1 rounded-lg p-1">
            {segments.map((seg) => (
                <button
                    key={seg.label}
                    type="button"
                    onClick={seg.onClick}
                    className={`text-xs ui-menu-segment flex-1 cursor-pointer rounded-md px-[var(--pm-btn-pad)] py-1.5 font-semibold transition duration-200 ${seg.active ? 'ui-menu-segment-active shadow-sm' : ''}`}
                >
                    {seg.label}
                </button>
            ))}
        </div>
    </div>
);

export default MenuTitleCard;
