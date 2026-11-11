export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Browsers cap the total body of keepalive requests at 64 KiB. */
export const KEEPALIVE_MAX_BYTES = 60_000;

export const DEFAULT_DEBOUNCE_MS = 900;
export const DEFAULT_RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];

export type AutosaverOptions = {
    /** Sends the payload; resolves true on success. */
    send: (body: string, options: { keepalive: boolean }) => Promise<boolean>;
    debounceMs?: number;
    /** Delay before each retry after a failure (the last value repeats). */
    retryDelaysMs?: number[];
    onStatusChange?: (status: SaveStatus) => void;
};

type BuildPayload = () => Promise<string>;

function byteLength(body: string): number {
    return new TextEncoder().encode(body).length;
}

/**
 * Debounced, deduplicated autosave with retry/backoff.
 *
 * - `schedule(build)` registers the latest state; it is saved after the
 *   debounce delay (a newer schedule replaces an older one).
 * - Identical payloads are not sent twice.
 * - Failures switch the status to `error` and retry with backoff.
 * - `flush()` saves immediately (e.g. when the tab is hidden or the
 *   workspace unmounts), optionally as a keepalive request.
 */
export class Autosaver {
    private readonly send: AutosaverOptions['send'];
    private readonly debounceMs: number;
    private readonly retryDelaysMs: number[];
    private readonly onStatusChange?: (status: SaveStatus) => void;

    private timer: ReturnType<typeof setTimeout> | null = null;
    private pending: BuildPayload | null = null;
    private inFlight: Promise<void> | null = null;
    private lastSavedBody: string | null = null;
    private attempt = 0;
    private status: SaveStatus = 'idle';
    private disposed = false;

    constructor(options: AutosaverOptions) {
        this.send = options.send;
        this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
        this.retryDelaysMs = options.retryDelaysMs?.length ? options.retryDelaysMs : DEFAULT_RETRY_DELAYS_MS;
        this.onStatusChange = options.onStatusChange;
    }

    getStatus(): SaveStatus {
        return this.status;
    }

    /** True while some change has not been confirmed by the server. */
    hasUnsavedChanges(): boolean {
        return this.pending !== null || this.inFlight !== null || this.status === 'error';
    }

    /** Registers the latest state to be saved after the debounce delay. */
    schedule(build: BuildPayload): void {
        if (this.disposed) return;
        this.pending = build;
        this.attempt = 0;
        this.startTimer(this.debounceMs);
    }

    /** Saves pending changes now. */
    async flush(options: { keepalive?: boolean } = {}): Promise<void> {
        this.clearTimer();
        await this.run(options.keepalive ?? false);
    }

    /** Stops timers; pending changes are dropped unless flushed first. */
    dispose(): void {
        this.disposed = true;
        this.clearTimer();
    }

    private setStatus(status: SaveStatus) {
        if (this.status === status) return;
        this.status = status;
        this.onStatusChange?.(status);
    }

    private clearTimer() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private startTimer(delay: number) {
        this.clearTimer();
        this.timer = setTimeout(() => {
            this.timer = null;
            void this.run(false);
        }, delay);
    }

    private scheduleRetry() {
        if (this.disposed) return;
        const index = Math.min(this.attempt, this.retryDelaysMs.length - 1);
        this.attempt++;
        this.startTimer(this.retryDelaysMs[index]);
    }

    private async run(keepaliveRequested: boolean): Promise<void> {
        // One save at a time; a change made meanwhile is saved right after.
        while (this.inFlight) await this.inFlight;

        const build = this.pending;
        if (!build) return;
        this.pending = null;

        const task = (async () => {
            let ok = false;
            try {
                const body = await build();
                if (body === this.lastSavedBody) {
                    ok = true;
                } else {
                    this.setStatus('saving');
                    const keepalive = keepaliveRequested && byteLength(body) <= KEEPALIVE_MAX_BYTES;
                    ok = await this.send(body, { keepalive });
                    if (ok) this.lastSavedBody = body;
                }
            } catch {
                ok = false;
            }

            if (ok) {
                this.attempt = 0;
                if (!this.pending) this.setStatus('saved');
            } else {
                // Keep the newest state if one arrived; otherwise retry this one.
                if (!this.pending) this.pending = build;
                this.setStatus('error');
                this.scheduleRetry();
            }
        })();

        this.inFlight = task;
        try {
            await task;
        } finally {
            if (this.inFlight === task) this.inFlight = null;
        }
    }
}
