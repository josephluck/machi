/**
 * An entry within the flow. An entry represents a single (potentially) terminal
 * node within the flow
 */
export type Entry<
  Context,
  Conditions extends Record<string, Condition<Context>>
> = {
  /**
   * Must be unique within the context of a machine
   */
  name: string;
  isDone: (keyof Conditions)[];
};

/**
 * A decision in the flow. When all requirements return truthy, the fork's
 * states will be evaluated during execution.
 */
export type Fork<
  Context,
  Conditions extends Record<string, Condition<Context>>
> = {
  fork: string;
  requirements: (keyof Conditions)[];
  states: State<Context, Conditions>[];
};

/**
 * A single Entry or Fork. The first Entry whose isDone is truthy will be the
 * terminal state in execution.
 */
export type State<
  Context,
  Conditions extends Record<string, Condition<Context>>
> = Fork<Context, Conditions> | Entry<Context, Conditions>;

export type HistoryState<
  Context,
  Conditions extends Record<string, Condition<Context>>
> =
  | (Fork<Context, Conditions> & { skipped: boolean })
  | Entry<Context, Conditions>;

/**
 * A predicate based on the machine's context
 */
export type Condition<Context> = (context: Context) => boolean;

/**
 * Creates a state machine.
 * Returns an initial execution state and history based on the given initial
 * context.
 */
export const makeMachine = <
  Context extends any = void,
  Conditions extends Record<string, Condition<Context>> = Record<
    string,
    Condition<Context>
  >
>(
  /**
   * The states in the machine.
   */
  states: State<Context, Conditions>[],
  /**
   * The condition functions (used by states) of the machine. States in the
   * machine can refer to condition functions by their key in this object as
   * entry requirements for a fork or as "done" identifiers for an entry.
   */
  conditions: Conditions
) => {
  type ConditionsResult = Record<keyof Conditions, boolean>;

  type ExecuteResult = {
    entry: Entry<Context, Conditions>;
    history: HistoryState<Context, Conditions>[];
  };

  type InternalExecuteResult = ExecuteResult & {
    entryInHistory: Entry<Context, Conditions> | undefined;
  };

  const evaluateConditions = (context: Context) =>
    Object.entries(conditions).reduce(
      (acc, [c, fn]): ConditionsResult => ({
        ...acc,
        [c]: fn(context),
      }),
      {} as ConditionsResult
    );

  const process = (
    context: Context,
    currentEntryName: string | undefined,
    _states: State<Context, Conditions>[],
    _history: HistoryState<Context, Conditions>[],
    _evaluatedConditions = evaluateConditions(context),
    _entryInHistory: Entry<Context, Conditions> | undefined
  ): InternalExecuteResult | undefined => {
    const result = _states.reduce((entryFoundInCurrentLevel, state) => {
      if (isForkEntered(state, _evaluatedConditions)) {
        _history.push({ ...state, skipped: false });
        return process(
          context,
          currentEntryName,
          state.states,
          _history,
          _evaluatedConditions,
          _entryInHistory
        );
      } else if (isFork(state)) {
        // _history.push({ ...state, skipped: true });
      }

      if (entryFoundInCurrentLevel) {
        const _entriesInHistory = _history.filter(isEntry);
        if (currentEntryName && _entriesInHistory.length) {
          const nextIndexInHistory = _entriesInHistory.findIndex(
            (s) => isEntry(s) && s.name === currentEntryName
          );
          const entryInHistory = _entriesInHistory[nextIndexInHistory + 1];

          return entryInHistory && isEntry(entryInHistory)
            ? { ...entryFoundInCurrentLevel, entryInHistory }
            : entryFoundInCurrentLevel;
        }

        return entryFoundInCurrentLevel;
      }

      if (isEntryDone(state, _evaluatedConditions)) {
        _history.push(state);
      }

      if (isEntryNext(state, _evaluatedConditions)) {
        return {
          entry: state,
          history: _history,
          entryInHistory: _entryInHistory,
        };
      }
    }, undefined as InternalExecuteResult | undefined);

    return result;
  };

  /**
   * Evaluate the next context in the machine given a new state.
   *
   * Provide a current entry name to return the entry immediately after the
   * provided entry in the history stack.
   */
  const execute = (
    /**
     * The next machine context. Passed to conditions to evaluate traversal
     * through the states in the machine.
     */
    context: Context,
    /**
     * Used to determine whether to preserve the history and navigate to the
     * next entry. Used when the current state is somewhere back in the history
     * stack. For example, the user has navigated back to an earlier point in
     * a navigation flow and is updating information (they should go forwards in
     * the same order as they went back, unless they end up changing state entry
     * requirements via data-driven conditions).
     */
    currentEntryName: string | undefined = undefined,
    /**
     * INTERNAL USE ONLY
     * The states to evaluate. Used when recursing over states in the machine.
     */
    _states: State<Context, Conditions>[] = states,
    /**
     * INTERNAL USE ONLY
     * Used when recursing over states whose conditions return truthy (aka the
     * states that have been "visited" on the way to the final state) to build
     * up the pathway of visited states during execution.
     */
    _history: Entry<Context, Conditions>[] = [],
    /**
     * INTERNAL USE ONLY
     * Used as a cache of the condition results based on the next context so
     * that the conditions aren't re-evaluated during recursion.
     */
    _evaluatedConditions = evaluateConditions(context),
    _entryInHistory: Entry<Context, Conditions> | undefined = undefined
  ): ExecuteResult | undefined => {
    const result = process(
      context,
      currentEntryName,
      _states,
      _history,
      _evaluatedConditions,
      _entryInHistory
    );

    if (!result) {
      return;
    }

    const { entry, entryInHistory, ...rest } = result;

    return { ...rest, entry: entryInHistory || entry };
  };

  return execute;
};

export const isFork = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>
>(
  state: State<Context, Conditions>
): state is Fork<Context, Conditions> =>
  typeof state === "object" && state.hasOwnProperty("states");

export const isEntry = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>
>(
  state: State<Context, Conditions>
): state is Entry<Context, Conditions> => !isFork(state);

/**
 * Returns a boolean representing whether the provided state is a fork and
 * whether it should be executed according to the current context.
 */
export const isForkEntered = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>
>(
  state: State<Context, Conditions>,
  evaluatedConditions: Record<keyof Conditions, boolean>
): state is Fork<Context, Conditions> =>
  isFork<Context, Conditions>(state) &&
  state.requirements.every((name) => evaluatedConditions[name]);

/**
 * Returns a boolean representing whether the provided state is an entry state
 * and whether it is considered to be "done" according to the current context.
 */
export const isEntryDone = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>
>(
  state: State<Context, Conditions>,
  evaluatedConditions: Record<keyof Conditions, boolean>
): state is Entry<Context, Conditions> =>
  isEntry<Context, Conditions>(state) &&
  state.isDone.every((name) => evaluatedConditions[name]);

/**
 * Returns a boolean representing whether the provided state is an entry state
 * and whether it is considered to be the next entry according to the current
 * context.
 */
export const isEntryNext = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>
>(
  state: State<Context, Conditions>,
  evaluatedConditions: Record<keyof Conditions, boolean>
): state is Entry<Context, Conditions> =>
  isEntry<Context, Conditions>(state) &&
  state.isDone.some((name) => !evaluatedConditions[name]);
