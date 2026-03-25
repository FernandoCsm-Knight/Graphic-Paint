'use client';

import { forwardRef, useState, type MouseEvent, type ReactNode } from 'react';

type WorkspaceToolButtonProps = {
    children?: ReactNode;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
    stayActive?: boolean;
    className?: string;
    ariaLabel?: string;
    active?: boolean;
    disabled?: boolean;
    title?: string;
    type?: 'button' | 'submit' | 'reset';
};

const WorkspaceToolButton = forwardRef<HTMLButtonElement, WorkspaceToolButtonProps>(({
    children,
    onClick,
    stayActive = false,
    className = '',
    ariaLabel,
    active,
    disabled = false,
    title,
    type = 'button'
}, ref) => {
    const [buttonActive, setButtonActive] = useState(false);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        if (active === undefined) setButtonActive((current) => !current);
        onClick?.(event);
    };

    const isActive = active ?? buttonActive;

    return (
        <button
            ref={ref}
            type={type}
            onClick={handleClick}
            aria-label={ariaLabel}
            title={title}
            disabled={disabled}
            className={`workspace-tool-button rounded-md border-0 p-[var(--pm-btn-pad)] no-underline outline-none ${
                disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'
            } ${isActive && stayActive ? 'workspace-tool-button-active' : ''} ${className}`.trim()}
        >
            {children}
        </button>
    );
});

WorkspaceToolButton.displayName = 'WorkspaceToolButton';

export default WorkspaceToolButton;
