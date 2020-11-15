/**
 * An entry within the flow. An entry represents a single (potentially) terminal
 * node within the flow
 */
export type Entry<
  Context,
  Conditions extends Record<string, Condition<Context>>,
  AdditionalEntryData = never
> = AdditionalEntryData extends never
  ? {
      /**
       * Must be unique within the context of a machine
       */
      id: string;
      isDone: (keyof Conditions)[];
    }
  : AdditionalEntryData & {
      /**
       * Must be unique within the context of a machine
       */
      id: string;
      isDone: (keyof Conditions)[];
    };

/**
 * A decision in the flow. When all requirements return truthy, the fork's
 * states will be evaluated during execution.
 */
export type Fork<
  Context,
  Conditions extends Record<string, Condition<Context>>,
  AdditionalEntryData
> = {
  fork: string;
  /**
   * Optional name to create a group around this forks sub-groups during chart
   * generation.
   */
  chartGroup?: string;
  requirements: (keyof Conditions)[];
  states: State<Context, Conditions, AdditionalEntryData>[];
};

/**
 * A single Entry or Fork. The first Entry whose isDone is truthy will be the
 * terminal state in execution.
 */
export type State<
  Context,
  Conditions extends Record<string, Condition<Context>>,
  AdditionalEntryData
> =
  | Fork<Context, Conditions, AdditionalEntryData>
  | Entry<Context, Conditions, AdditionalEntryData>;

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
  AdditionalEntryData extends {} = never,
  Conditions extends Record<string, Condition<Context>> = Record<
    string,
    Condition<Context>
  >
>(
  /**
   * The states in the machine.
   */
  states: State<Context, Conditions, AdditionalEntryData>[],
  /**
   * The condition functions (used by states) of the machine. States in the
   * machine can refer to condition functions by their key in this object as
   * entry requirements for a fork or as "done" identifiers for an entry.
   */
  conditions: Conditions
) => {
  type ConditionsResult = Record<keyof Conditions, boolean>;

  type ExecuteResult = {
    entry: Entry<Context, Conditions, AdditionalEntryData>;
    history: State<Context, Conditions, AdditionalEntryData>[];
  };

  type InternalExecuteResult = ExecuteResult & {
    entryInHistory: Entry<Context, Conditions, AdditionalEntryData> | undefined;
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
    _states: State<Context, Conditions, AdditionalEntryData>[] = [],
    history: State<Context, Conditions, AdditionalEntryData>[] = [],
    evaluatedConditions = evaluateConditions(context),
    entryInHistory:
      | Entry<Context, Conditions, AdditionalEntryData>
      | undefined = undefined
  ): InternalExecuteResult | undefined => {
    const result = _states.reduce((entryFoundInCurrentLevel, state) => {
      if (isForkEntered(state, evaluatedConditions)) {
        history.push(state);
        return process(
          context,
          currentEntryName,
          state.states,
          history,
          evaluatedConditions,
          entryInHistory
        );
      }

      if (entryFoundInCurrentLevel) {
        /**
         * We're trying to find the next closest entry to the entry id passed
         * in to execute. This means the entire state tree will be evaluated as
         * normal, but we'll provide the next closest entry rather than the last
         * entry in the resultant history.
         * NB: important to still return the full history as normal. For use
         * cases such as traversing back and forth through a navigation back
         * stack.
         */
        const entriesInHistory = history.filter(isEntry);
        if (currentEntryName && entriesInHistory.length) {
          const currentIndexInHistory = entriesInHistory.findIndex(
            (s) => isEntry(s) && s.id === currentEntryName
          );
          const nextEntryInHistory =
            entriesInHistory[currentIndexInHistory + 1];

          return nextEntryInHistory && isEntry(nextEntryInHistory)
            ? {
                ...entryFoundInCurrentLevel,
                entryInHistory: nextEntryInHistory,
              }
            : entryFoundInCurrentLevel;
        }

        return entryFoundInCurrentLevel;
      }

      if (isEntryDone(state, evaluatedConditions)) {
        history.push(state);
      }

      if (isEntryNext(state, evaluatedConditions)) {
        return {
          entry: state,
          history,
          entryInHistory,
        };
      }
    }, undefined as InternalExecuteResult | undefined);

    return result;
  };

  /**
   * Evaluate the next context in the machine given a new state.
   *
   * Provide a current entry id to return the entry immediately after the
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
    _states: State<Context, Conditions, AdditionalEntryData>[] = states,
    /**
     * INTERNAL USE ONLY
     * Used when recursing over states whose conditions return truthy (aka the
     * states that have been "visited" on the way to the final state) to build
     * up the pathway of visited states during execution.
     */
    _history: Entry<Context, Conditions, AdditionalEntryData>[] = [],
    /**
     * INTERNAL USE ONLY
     * Used as a cache of the condition results based on the next context so
     * that the conditions aren't re-evaluated during recursion.
     */
    _evaluatedConditions = evaluateConditions(context),
    _entryInHistory:
      | Entry<Context, Conditions, AdditionalEntryData>
      | undefined = undefined
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
  Conditions extends Record<string, Condition<Context>>,
  AdditionalEntryData extends {} = {}
>(
  state: State<Context, Conditions, AdditionalEntryData>
): state is Fork<Context, Conditions, AdditionalEntryData> =>
  typeof state === "object" &&
  state.hasOwnProperty("fork") &&
  state.hasOwnProperty("states") &&
  !state.hasOwnProperty("id");

export const isEntry = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>,
  AdditionalEntryData extends {} = {}
>(
  state: State<Context, Conditions, AdditionalEntryData>
): state is Entry<Context, Conditions, AdditionalEntryData> => !isFork(state);

/**
 * Returns a boolean representing whether the provided state is a fork and
 * whether it should be executed according to the current context.
 */
export const isForkEntered = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>,
  AdditionalEntryData extends {} = {}
>(
  state: State<Context, Conditions, AdditionalEntryData>,
  evaluatedConditions: Record<keyof Conditions, boolean>
): state is Fork<Context, Conditions, AdditionalEntryData> =>
  isFork<Context, Conditions, AdditionalEntryData>(state) &&
  state.requirements.every((id) => evaluatedConditions[id]);

/**
 * Returns a boolean representing whether the provided state is an entry state
 * and whether it is considered to be "done" according to the current context.
 */
export const isEntryDone = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>,
  AdditionalEntryData extends {} = {}
>(
  state: State<Context, Conditions, AdditionalEntryData>,
  evaluatedConditions: Record<keyof Conditions, boolean>
): state is Entry<Context, Conditions, AdditionalEntryData> =>
  isEntry<Context, Conditions, AdditionalEntryData>(state) &&
  state.isDone.every((key) => evaluatedConditions[key]);

/**
 * Returns a boolean representing whether the provided state is an entry state
 * and whether it is considered to be the next entry according to the current
 * context.
 */
export const isEntryNext = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>,
  AdditionalEntryData extends {} = {}
>(
  state: State<Context, Conditions, AdditionalEntryData>,
  evaluatedConditions: Record<keyof Conditions, boolean>
): state is Entry<Context, Conditions, AdditionalEntryData> =>
  isEntry<Context, Conditions, AdditionalEntryData>(state) &&
  state.isDone.some((key) => !evaluatedConditions[key]);
