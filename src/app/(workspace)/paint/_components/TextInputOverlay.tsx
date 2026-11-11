'use client';

import { useEffect, useRef, useState } from 'react';
import { TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from '../_shapes/TextShape';

const PLACEHOLDER = 'Digite…';

type TextInputOverlayProps = {
    /** Position of the text's top-left corner, in container pixels. */
    left: number;
    top: number;
    /** On-screen font size (already multiplied by zoom). */
    fontPx: number;
    color: string;
    bold?: boolean;
    initialText: string;
    onCommit: (text: string) => void;
    onCancel: () => void;
};

/**
 * Inline text box used by the text tool. Enter confirms, Shift+Enter adds a
 * line, Esc cancels, clicking elsewhere confirms.
 */
const TextInputOverlay = ({ left, top, fontPx, color, bold = false, initialText, onCommit, onCancel }: TextInputOverlayProps) => {
    const [value, setValue] = useState(initialText);
    const ref = useRef<HTMLTextAreaElement>(null);
    const doneRef = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // Focus only after the click that opened the box has finished: focusing
        // now would be undone by the click's default focus change (and the
        // resulting blur would close the empty box).
        const id = requestAnimationFrame(() => {
            el.focus();
            el.select();
        });
        return () => cancelAnimationFrame(id);
    }, []);

    const finish = (commit: boolean) => {
        if (doneRef.current) return;
        doneRef.current = true;
        if (commit) onCommit(value);
        else onCancel();
    };

    const lines = value.split('\n');
    // While empty, size the box for the placeholder.
    const longest = Math.max(value ? 1 : PLACEHOLDER.length, ...lines.map((line) => line.length));

    return (
        <textarea
            ref={ref}
            value={value}
            aria-label="Texto"
            placeholder={PLACEHOLDER}
            spellCheck={false}
            wrap="off"
            rows={lines.length}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    finish(true);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    finish(false);
                }
            }}
            onBlur={() => finish(true)}
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute z-40 resize-none overflow-hidden rounded-sm border border-dashed border-sky-500 bg-white/70 p-0 outline-none"
            style={{
                left,
                top,
                color,
                fontSize: fontPx,
                fontFamily: TEXT_FONT_FAMILY,
                fontWeight: bold ? 700 : 400,
                lineHeight: TEXT_LINE_HEIGHT,
                whiteSpace: 'pre',
                width: `calc(${longest + 1}ch + 4px)`,
                minWidth: Math.max(40, fontPx * 2),
            }}
        />
    );
};

export default TextInputOverlay;
