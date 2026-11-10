import type { Point } from "@/types/geometry";

/**
 * mulberry32: small, fast 32-bit seeded PRNG.
 * Returns a function producing floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** New random 32-bit seed for a stroke. */
export function createSpraySeed(): number {
    return Math.floor(Math.random() * 0x100000000) >>> 0;
}

/**
 * Dots sprayed around the `index`-th point of a stroke.
 * Each point gets its own deterministic sequence (seed mixed with the index),
 * so live drawing (point by point) and replay (all points) produce exactly
 * the same dots.
 */
export function sprayDots(center: Point, index: number, seed: number, lineWidth: number): Point[] {
    const random = mulberry32((seed ^ Math.imul(index + 1, 0x9E3779B1)) >>> 0);
    const density = Math.max(8, lineWidth * 3);
    const radius = lineWidth * 2.5;
    const dots: Point[] = [];

    for (let i = 0; i < density; i++) {
        const angle = random() * Math.PI * 2;
        const r = Math.sqrt(random()) * radius;
        dots.push({ x: center.x + r * Math.cos(angle), y: center.y + r * Math.sin(angle) });
    }

    return dots;
}
