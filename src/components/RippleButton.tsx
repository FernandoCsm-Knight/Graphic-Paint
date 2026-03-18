import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

type Ripple = {
    key: number;
    x: number;
    y: number;
};

type RippleButtonProps = {
    controlId: string;
    className?: string;
    ariaLabel?: string;
    title?: string;
    children: ReactNode;
    onClick?: () => void;
};

const RippleButton = ({
    controlId,
    className,
    ariaLabel,
    title,
    children,
    onClick
}: RippleButtonProps) => {
    const [pressed, setPressed] = useState(false);
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const feedbackTimeoutRef = useRef<number | null>(null);
    const rippleTimeoutsRef = useRef<number[]>([]);

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const key = window.performance.now();

        setPressed(true);
        onClick?.();

        if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
        }

        feedbackTimeoutRef.current = window.setTimeout(() => {
            setPressed(false);
            feedbackTimeoutRef.current = null;
        }, 260);

        const timeoutId = window.setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.key !== key));
            rippleTimeoutsRef.current = rippleTimeoutsRef.current.filter((id) => id !== timeoutId);
        }, 620);

        rippleTimeoutsRef.current.push(timeoutId);

        setRipples((current) => [
            ...current,
            {
                key,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
        ]);
    };

    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current) {
                window.clearTimeout(feedbackTimeoutRef.current);
            }

            rippleTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
        };
    });

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`${className} hover:cursor-pointer ${pressed ? 'sidebar-toggle-pressed module-card-pressed' : ''}`}
            aria-label={ariaLabel}
            title={title}
            data-control-id={controlId}
        >
            {children}
            {ripples.map((ripple) => (
                <span
                    key={ripple.key}
                    className="click-ripple"
                    style={{ left: ripple.x, top: ripple.y }}
                />
            ))}
        </button>
    );
};

export default RippleButton;
