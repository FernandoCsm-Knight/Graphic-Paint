import type { AutomatonState, AutomatonTransition, SimulationStep, StateId } from '../types/automaton';

// ── Helpers ────────────────────────────────────────────────────────────────────

const EPSILON_SYMBOLS = new Set(['λ', 'ε', '']);

/** Split a (possibly comma-separated) transition symbol into individual tokens. */
function splitSymbols(symbol: string): string[] {
    return symbol.split(',').map((s) => s.trim());
}

function isEpsilon(symbol: string): boolean {
    return splitSymbols(symbol).some((s) => EPSILON_SYMBOLS.has(s));
}

/**
 * Compute the ε-closure of a set of states (BFS).
 * Returns all states reachable from `startIds` via zero or more ε-transitions.
 */
export function epsilonClosure(
    startIds: StateId[],
    transitions: AutomatonTransition[],
): Set<StateId> {
    const closure = new Set<StateId>(startIds);
    const queue = [...startIds];

    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const t of transitions) {
            if (t.source === current && isEpsilon(t.symbol) && !closure.has(t.target)) {
                closure.add(t.target);
                queue.push(t.target);
            }
        }
    }

    return closure;
}

/**
 * Given a set of current states and an input symbol `char`, return all states
 * reachable by a transition labeled exactly `char`.
 */
function step(
    currentStates: Set<StateId>,
    char: string,
    transitions: AutomatonTransition[],
): { nextStates: Set<StateId>; usedTransitionIds: Set<TransitionId> } {
    const nextStates = new Set<StateId>();
    const usedTransitionIds = new Set<TransitionId>();

    for (const t of transitions) {
        if (currentStates.has(t.source) && splitSymbols(t.symbol).includes(char)) {
            nextStates.add(t.target);
            usedTransitionIds.add(t.id);
        }
    }

    return { nextStates, usedTransitionIds };
}

/** Format a set of state ids as a readable label using their display labels. */
function formatStates(ids: Set<StateId>, stateMap: Map<StateId, AutomatonState>): string {
    if (ids.size === 0) return '∅';
    return (
        '{' +
        [...ids]
            .map((id) => stateMap.get(id)?.label ?? id)
            .sort()
            .join(', ') +
        '}'
    );
}

// ── Main simulation ────────────────────────────────────────────────────────────

/**
 * Simulate the given AFN-λ on `input`, returning a trace of SimulationStep.
 *
 * Granularity: one step per input character + one initial step.
 * Total steps = input.length + 1.
 *
 * Edge cases:
 * - No initial state → single step with empty active set (rejected).
 * - Empty input → single step showing ε-closure of the initial state.
 */
export function simulateAFNLambda(
    states: AutomatonState[],
    transitions: AutomatonTransition[],
    input: string,
): SimulationStep[] {
    const stateMap = new Map(states.map((s) => [s.id, s]));
    const finalIds = new Set(states.filter((s) => s.isFinal).map((s) => s.id));
    const initialState = states.find((s) => s.isInitial);

    // ── No initial state ──────────────────────────────────────────────────────
    if (!initialState) {
        return [
            {
                activeStates: new Set(),
                activeTransitionIds: new Set(),
                inputConsumed: 0,
                description: 'Nenhum estado inicial definido',
                isAccepted: false,
            },
        ];
    }

    const steps: SimulationStep[] = [];

    // ── Step 0: ε-closure of initial state ────────────────────────────────────
    let currentStates = epsilonClosure([initialState.id], transitions);
    const isAcceptedInitial = [...currentStates].some((id) => finalIds.has(id));

    steps.push({
        activeStates: new Set(currentStates),
        activeTransitionIds: new Set(),
        inputConsumed: 0,
        description: `Estado inicial — ε-fecho: ${formatStates(currentStates, stateMap)}`,
        isAccepted: isAcceptedInitial,
    });

    // ── Steps 1..N: read each character ──────────────────────────────────────
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const { nextStates, usedTransitionIds } = step(currentStates, char, transitions);
        const afterClosure = epsilonClosure([...nextStates], transitions);
        const isAccepted = [...afterClosure].some((id) => finalIds.has(id));

        const isLastChar = i === input.length - 1;
        let description: string;
        if (isLastChar) {
            const verdict = isAccepted ? 'Aceita ✓' : 'Rejeitada ✗';
            description = `Lendo '${char}' → ${formatStates(afterClosure, stateMap)} — ${verdict}`;
        } else {
            description = `Lendo '${char}' → ε-fecho: ${formatStates(afterClosure, stateMap)}`;
        }

        // Include ε-transitions used in the closure pass as active transitions too
        const epsilonTransitionIds = new Set<TransitionId>();
        for (const t of transitions) {
            if (isEpsilon(t.symbol) && nextStates.has(t.source) && afterClosure.has(t.target)) {
                epsilonTransitionIds.add(t.id);
            }
        }

        steps.push({
            activeStates: new Set(afterClosure),
            activeTransitionIds: new Set([...usedTransitionIds, ...epsilonTransitionIds]),
            inputConsumed: i + 1,
            description,
            isAccepted,
        });

        currentStates = afterClosure;
    }

    // If input was empty, annotate the initial step with acceptance verdict
    if (input.length === 0) {
        const s = steps[0];
        const verdict = s.isAccepted ? 'Aceita ✓' : 'Rejeitada ✗';
        steps[0] = { ...s, description: `${s.description} — ${verdict}` };
    }

    return steps;
}
