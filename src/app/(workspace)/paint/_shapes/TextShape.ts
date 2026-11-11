import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";
import { toPixels } from "../_types/Graphics";
import type { Point } from "@/types/geometry";

export const TEXT_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const TEXT_LINE_HEIGHT = 1.25;

let measureCtx: CanvasRenderingContext2D | null | undefined;

function getMeasureContext(): CanvasRenderingContext2D | null {
    if (measureCtx !== undefined) return measureCtx;
    measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    return measureCtx;
}

/** Pixel mode uses bold so strokes survive the one-pixel-per-cell rasterisation. */
export function textFont(fontSize: number, bold = false): string {
    return `${bold ? 'bold ' : ''}${fontSize}px ${TEXT_FONT_FAMILY}`;
}

/**
 * Natural size of a (possibly multi-line) text block at `fontSize` pixels.
 * Without a DOM (tests) a 0.6em-per-character estimate is used.
 */
export function measureTextBlock(text: string, fontSize: number, bold = false): { width: number; height: number } {
    const lines = text.split('\n');
    const ctx = getMeasureContext();
    let width = 0;
    for (const line of lines) {
        const w = ctx ? (ctx.font = textFont(fontSize, bold), ctx.measureText(line).width) : line.length * fontSize * 0.6;
        width = Math.max(width, w);
    }
    return {
        width: Math.max(1, Math.ceil(width)),
        height: Math.max(1, Math.ceil(lines.length * fontSize * TEXT_LINE_HEIGHT)),
    };
}

/**
 * A block of text placed on the canvas.
 *
 * Like ImageShape it is a box (x, y, width, height) with a canvas-transform
 * `rotation`; the text is drawn stretched to fill the box, so resizing the
 * box scales the text. The text itself is kept (not rasterised), so it can
 * be edited and is saved with the project.
 *
 * Pixel mode: coordinates are grid cells (inclusive, like ImageShape) and the
 * text is rasterised one cell per pixel, giving a pixel-art look.
 */
export default class TextShape extends Shape {
    readonly kind = 'text' as const;
    text: string;
    /** Font size used to lay out the text (px; grid cells in pixel mode). */
    fontSize: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number = 0;
    flipX: boolean = false;
    flipY: boolean = false;

    private _frozenCenter: Point | null = null;
    private _frozenRotation: number = 0;

    constructor(text: string, x: number, y: number, fontSize: number, opts: ShapeOptions = {}) {
        super(opts);
        this.text = text;
        this.fontSize = fontSize;
        this.x = x;
        this.y = y;
        const size = this.naturalSize();
        this.width = this.pixelated ? Math.max(0, size.width - 1) : size.width;
        this.height = this.pixelated ? Math.max(0, size.height - 1) : size.height;
    }

    /** Unstretched size of the text block (px, or cells in pixel mode). */
    naturalSize(): { width: number; height: number } {
        return measureTextBlock(this.text, this.fontSize, this.pixelated);
    }

    /**
     * Replaces the text, keeping position, font size and any stretch the user
     * applied by resizing.
     */
    setText(text: string): void {
        const before = this.naturalSize();
        const outerW = this.pixelated ? this.width + 1 : this.width;
        const outerH = this.pixelated ? this.height + 1 : this.height;
        const scaleX = outerW / before.width;
        const scaleY = outerH / before.height;
        this.text = text;
        const after = this.naturalSize();
        const nextW = after.width * scaleX;
        const nextH = after.height * scaleY;
        this.width = this.pixelated ? Math.max(0, Math.round(nextW) - 1) : nextW;
        this.height = this.pixelated ? Math.max(0, Math.round(nextH) - 1) : nextH;
    }

    override draw(ctx: CanvasRenderingContext2D): void {
        const center = this.getCenter();
        const c = this.pixelated ? toPixels(center, this.pixelSize) : center;
        const pixelHalf = this.pixelated ? this.pixelSize / 2 : 0;
        ctx.save();
        ctx.translate(c.x + pixelHalf, c.y + pixelHalf);
        ctx.rotate(this.rotation);
        ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        ctx.translate(-(c.x + pixelHalf), -(c.y + pixelHalf));
        if (this.pixelated) this.pixelatedDraw(ctx);
        else this.standardDraw(ctx);
        ctx.restore();
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        const natural = this.naturalSize();
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.width / natural.width, this.height / natural.height);
        ctx.fillStyle = this.strokeStyle;
        ctx.font = textFont(this.fontSize);
        ctx.textBaseline = 'top';
        this.text.split('\n').forEach((line, i) => {
            ctx.fillText(line, 0, i * this.fontSize * TEXT_LINE_HEIGHT + this.fontSize * 0.1);
        });
        ctx.restore();
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        const mask = this.getPixelMask();
        if (!mask) return;
        const cols = this.width + 1;
        const rows = this.height + 1;
        const origin = toPixels({ x: this.x, y: this.y }, this.pixelSize);
        ctx.fillStyle = this.strokeStyle;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const sx = Math.floor(((col + 0.5) / cols) * mask.width);
                const sy = Math.floor(((row + 0.5) / rows) * mask.height);
                if (mask.alpha[sy * mask.width + sx] > 90) {
                    ctx.fillRect(origin.x + col * this.pixelSize, origin.y + row * this.pixelSize, this.pixelSize, this.pixelSize);
                }
            }
        }
    }

    /** Text rendered at one pixel per cell (cached per text + font size). */
    private _maskKey = '';
    private _mask: { width: number; height: number; alpha: Uint8ClampedArray } | null = null;

    private getPixelMask() {
        const key = `${this.fontSize}|${this.text}`;
        if (this._mask && this._maskKey === key) return this._mask;
        if (typeof document === 'undefined') return null;
        const natural = this.naturalSize();
        const canvas = document.createElement('canvas');
        canvas.width = natural.width;
        canvas.height = natural.height;
        const off = canvas.getContext('2d');
        if (!off) return null;
        off.fillStyle = '#000';
        off.font = textFont(this.fontSize, true);
        off.textBaseline = 'top';
        this.text.split('\n').forEach((line, i) => {
            off.fillText(line, 0, i * this.fontSize * TEXT_LINE_HEIGHT + this.fontSize * 0.1);
        });
        const data = off.getImageData(0, 0, canvas.width, canvas.height).data;
        const alpha = new Uint8ClampedArray(canvas.width * canvas.height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
        this._mask = { width: canvas.width, height: canvas.height, alpha };
        this._maskKey = key;
        return this._mask;
    }

    getBoundingBox(): BoundingBox {
        const corners = this.getRotatedCorners();
        const xs = corners.map((p) => p.x);
        const ys = corners.map((p) => p.y);
        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
        };
    }

    override getCenter(): Point {
        return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
    }

    override getVisualRotation(): number {
        return this.rotation;
    }

    override getOverlayBounds(): BoundingBox {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    moveBy(dx: number, dy: number): void {
        this.x += this.pixelated ? Math.round(dx) : dx;
        this.y += this.pixelated ? Math.round(dy) : dy;
    }

    override beginRotate(): void {
        this._frozenCenter = this.getCenter();
        this._frozenRotation = this.rotation;
    }

    override endRotate(): void {
        this._frozenCenter = null;
    }

    rotateBy(angle: number, pivot: Point): void {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const src = this._frozenCenter ?? this.getCenter();
        const dx = src.x - pivot.x;
        const dy = src.y - pivot.y;
        const next = { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
        const nx = next.x - this.width / 2;
        const ny = next.y - this.height / 2;
        this.x = this.pixelated ? Math.round(nx) : nx;
        this.y = this.pixelated ? Math.round(ny) : ny;
        this.rotation = this._frozenRotation + angle;
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        const round = (v: number) => (this.pixelated ? Math.round(v) : v);
        this.x = round(bounds.x);
        this.y = round(bounds.y);
        this.width = Math.max(this.pixelated ? 0 : 1, round(bounds.width));
        this.height = Math.max(this.pixelated ? 0 : 1, round(bounds.height));
        this.flipX = Boolean(options.flipX);
        this.flipY = Boolean(options.flipY);
        return true;
    }

    getRotatedCorners(): Point[] {
        const center = this.getCenter();
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        return [
            { x: this.x, y: this.y },
            { x: this.x + this.width, y: this.y },
            { x: this.x + this.width, y: this.y + this.height },
            { x: this.x, y: this.y + this.height },
        ].map((corner) => {
            const dx = corner.x - center.x;
            const dy = corner.y - center.y;
            return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
        });
    }
}
