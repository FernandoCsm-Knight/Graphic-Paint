import type { AutomatonState, AutomatonTransition, SimulationStep, StateId, TransitionId } from '../_types/automaton';

// ── Helpers ────────────────────────────────────────────────────────────────────

const EPSILON_SYMBOLS = new Set(['λ', 'ε', '']);

function isEpsilonSymbol(s: string): boolean {
    return EPSILON_SYMBOLS.has(s.trim());
}

/** Split comma-separated read symbols (e.g. "a,b" → ['a','b']). */
function splitSymbols(symbol: string): string[] {
    return symbol.split(',').map((s) => s.trim());
}

/** Readable stack display: [] or [A, B, …] (index 0 = topo). */
function formatStack(stack: string[]): string {
    return stack.length === 0 ? '[]' : `[${stack.join(', ')}]`;
}

/** Format a set of state ids using their display labels. */
function formatStates(ids: Set<StateId>, stateMap: Map<StateId, AutomatonState>): string {
    if (ids.size === 0) return '∅';
    return '{' + [...ids].map((id) => stateMap.get(id)?.label ?? id).sort().join(', ') + '}';
}

// ── Configuration ─────────────────────────────────────────────────────────────

interface PDAConfig {
    stateId: StateId;
    inputPos: number;
    stack: string[];
}

type ConfigKey = string;

function configKey(c: PDAConfig): ConfigKey {
    return `${c.stateId}|${c.inputPos}|${c.stack.join(',')}`;
}

/**
 * Try to fire transition `t` from config `c` reading `currentChar` (or λ-move).
 * Returns the resulting config, or null if the transition doesn't apply.
 */
function applyTransition(
    c: PDAConfig,
    t: AutomatonTransition,
    currentChar: string | null,  // null = check λ-moves only
): PDAConfig | null {
    if (t.source !== c.stateId) return null;

    const symbols = splitSymbols(t.symbol);
    const isLambdaMove = symbols.every((s) => isEpsilonSymbol(s));

    if (currentChar === null) {
        // We only want λ-moves
        if (!isLambdaMove) return null;
    } else {
        // We only want moves that consume currentChar
        if (!symbols.includes(currentChar)) return null;
    }

    // Check and apply stackPop
    const pop = t.stackPop?.trim() ?? '';
    let newStack = [...c.stack];

    if (!isEpsilonSymbol(pop)) {
        // Must match top of stack
        if (newStack.length === 0 || newStack[0] !== pop) return null;
        newStack = newStack.slice(1);
    }

    // Apply stackPush
    const push = t.stackPush?.trim() ?? '';
    if (!isEpsilonSymbol(push)) {
        // Push each character; last char ends up deepest, first char on top
        const pushChars = push.split('').reverse();
        newStack = [...pushChars, ...newStack];
    }

    return {
        stateId: t.target,
        inputPos: currentChar !== null ? c.inputPos + 1 : c.inputPos,
        stack: newStack,
    };
}

/**
 * Expand all λ-moves reachable from a set of configs via BFS.
 * Returns the expanded set and the transition ids used.
 */
function expandLambdaMoves(
    configs: PDAConfig[],
    transitions: AutomatonTransition[],
    globalVisited: Set<ConfigKey>,
): { configs: PDAConfig[]; usedTransitionIds: Set<TransitionId> } {
    const result = new Map<ConfigKey, PDAConfig>();
    const usedTransitionIds = new Set<TransitionId>();
    const queue = [...configs];

    for (const c of configs) result.set(configKey(c), c);

    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const t of transitions) {
            const next = applyTransition(current, t, null);
            if (!next) continue;
            const key = configKey(next);
            if (result.has(key) || globalVisited.has(key)) continue;
            result.set(key, next);
            usedTransitionIds.add(t.id);
            queue.push(next);
        }
    }

    return { configs: [...result.values()], usedTransitionIds };
}

// ── Main simulation ────────────────────────────────────────────────────────────

/**
 * Simulate a non-deterministic Pushdown Automaton on `input`.
 * Acceptance criterion: final state AND empty stack.
 *
 * Returns one SimulationStep per input character + one initial step.
 * Total steps = input.length + 1.
 */
export function simulatePDA(
    states: AutomatonState[],
    transitions: AutomatonTransition[],
    input: string,
): SimulationStep[] {
    const stateMap = new Map(states.map((s) => [s.id, s]));
    const finalIds = new Set(states.filter((s) => s.isFinal).map((s) => s.id));
    const initialState = states.find((s) => s.isInitial);

    if (!initialState) {
        return [{
            activeStates: new Set(),
            activeTransitionIds: new Set(),
            inputConsumed: 0,
            description: 'Nenhum estado inicial definido',
            isAccepted: false,
            stackSnapshot: [],
        }];
    }

    const globalVisited = new Set<ConfigKey>();
    const steps: SimulationStep[] = [];

    // ── Step 0: initial config + expand λ-moves ───────────────────────────────
    const initConfig: PDAConfig = { stateId: initialState.id, inputPos: 0, stack: [] };
    globalVisited.add(configKey(initConfig));

    const { configs: step0Configs, usedTransitionIds: step0Trans } =
        expandLambdaMoves([initConfig], transitions, globalVisited);

    for (const c of step0Configs) globalVisited.add(configKey(c));

    const step0States = new Set(step0Configs.map((c) => c.stateId));
    const step0Accepted = step0Configs.some(
        (c) => finalIds.has(c.stateId) && c.stack.length === 0,
    );
    const step0Stack = pickRepresentativeStack(step0Configs, finalIds, 0, input.length);

    let description0 = `Estado inicial — pilha: ${formatStack(step0Stack)}`;
    if (input.length === 0) {
        description0 += step0Accepted ? ' — Aceita ✓' : ' — Rejeitada ✗';
    }

    steps.push({
        activeStates: step0States,
        activeTransitionIds: step0Trans,
        inputConsumed: 0,
        description: description0,
        isAccepted: step0Accepted,
        stackSnapshot: step0Stack,
    });

    // ── Steps 1..N: read each character ──────────────────────────────────────
    let currentConfigs = step0Configs;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const nextConfigMap = new Map<ConfigKey, PDAConfig>();
        const usedTransitionIds = new Set<TransitionId>();

        // Fire all transitions that consume char
        for (const c of currentConfigs) {
            for (const t of transitions) {
                const next = applyTransition(c, t, char);
                if (!next) continue;
                const key = configKey(next);
                if (!nextConfigMap.has(key)) {
                    nextConfigMap.set(key, next);
                }
                usedTransitionIds.add(t.id);
            }
        }

        const afterChar = [...nextConfigMap.values()];

        // Expand λ-moves after reading char
        const { configs: expanded, usedTransitionIds: lambdaTrans } =
            expandLambdaMoves(afterChar, transitions, new Set(globalVisited));

        for (const c of expanded) globalVisited.add(configKey(c));

        const allTrans = new Set([...usedTransitionIds, ...lambdaTrans]);
        const activeStates = new Set(expanded.map((c) => c.stateId));
        const isAccepted = expanded.some(
            (c) => c.inputPos === i + 1 && finalIds.has(c.stateId) && c.stack.length === 0,
        );
        const stack = pickRepresentativeStack(expanded, finalIds, i + 1, input.length);

        const isLastChar = i === input.length - 1;
        let description: string;
        if (isLastChar) {
            const verdict = isAccepted ? 'Aceita ✓' : 'Rejeitada ✗';
            description = `Lendo '${char}' → ${formatStates(activeStates, stateMap)} pilha: ${formatStack(stack)} — ${verdict}`;
        } else {
            description = `Lendo '${char}' → ${formatStates(activeStates, stateMap)} pilha: ${formatStack(stack)}`;
        }

        steps.push({
            activeStates,
            activeTransitionIds: allTrans,
            inputConsumed: i + 1,
            description,
            isAccepted,
            stackSnapshot: stack,
        });

        currentConfigs = expanded;
    }

    return steps;
}

/**
 * Pick the most informative stack snapshot for display:
 * 1. If an accepting config exists at targetPos, use its stack (should be [])
 * 2. Otherwise pick the config furthest in input, tie-break by shortest stack
 */
function pickRepresentativeStack(
    configs: PDAConfig[],
    finalIds: Set<StateId>,
    targetPos: number,
    inputLength: number,
): string[] {
    // Accepting config takes priority
    const accepting = configs.find(
        (c) => c.inputPos === targetPos && finalIds.has(c.stateId) && c.stack.length === 0,
    );
    if (accepting) return [];

    // Final-state configs (even with non-empty stack) take second priority
    const finalConfigs = configs.filter((c) => finalIds.has(c.stateId));
    const pool = finalConfigs.length > 0 ? finalConfigs : configs;

    if (pool.length === 0) return [];

    // Furthest input, then shortest stack
    const best = pool.reduce((a, b) => {
        if (b.inputPos !== a.inputPos) return b.inputPos > a.inputPos ? b : a;
        return b.stack.length < a.stack.length ? b : a;
    });

    void inputLength; // unused, kept for clarity
    return best.stack;
}
