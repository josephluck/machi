/**
 * An entry within the flow. An entry represents a single (potentially) terminal
 * node within the flow
 */
export type Entry<Ctx, Conds extends Record<string, Condition<Ctx>>> = {
  name: string;
  isDone: (keyof Conds)[];
};

/**
 * A decision in the flow. When all requirements return truthy, the fork's
 * states will be evaluated during execution.
 */
export type Fork<Ctx, Conds extends Record<string, Condition<Ctx>>> = {
  fork: string;
  requirements: (keyof Conds)[];
  states: State<Ctx, Conds>[];
};

/**
 * A single Entry or Fork. The first Entry whose isDone is truthy will be the
 * terminal state in execution.
 */
export type State<Ctx, Conds extends Record<string, Condition<Ctx>>> =
  | Fork<Ctx, Conds>
  | Entry<Ctx, Conds>;

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
   * entry requirements for the state.
   */
  conditions: Conditions
) => {
  type ConditionsResult = Record<keyof Conditions, boolean>;
  type ExecuteResult = {
    entry: Entry<Context, Conditions>;
    history: Entry<Context, Conditions>[];
  };
  type InternalExecuteResult = ExecuteResult & {
    entryInHistory: Entry<Context, Conditions> | undefined;
  };

  const evaluateConditions = (context: Context) =>
    Object.entries(conditions).reduce(
      (acc, [c, name]): ConditionsResult => ({
        ...acc,
        [c]: name(context),
      }),
      {} as ConditionsResult
    );

  const process = (
    context: Context,
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
  ): InternalExecuteResult | undefined => {
    const result = _states.reduce((entryFoundInCurrentLevel, state) => {
      if (
        isFork<Context, Conditions>(state) &&
        state.requirements.every((name) => _evaluatedConditions[name])
      ) {
        return process(
          context,
          currentEntryName,
          state.states,
          _history,
          _evaluatedConditions,
          _entryInHistory
        );
      }

      if (entryFoundInCurrentLevel) {
        if (currentEntryName && _history.length) {
          const nextIndexInHistory = _history.findIndex(
            (entry) => entry.name === currentEntryName
          );
          const entryInHistory = _history[nextIndexInHistory + 1];

          return entryInHistory
            ? { ...entryFoundInCurrentLevel, entryInHistory }
            : entryFoundInCurrentLevel;
        }

        return entryFoundInCurrentLevel;
      }

      if (
        isEntry<Context, Conditions>(state) &&
        state.isDone.every((name) => _evaluatedConditions[name])
      ) {
        _history.push(state);
      }

      if (
        isEntry<Context, Conditions>(state) &&
        state.isDone.some((name) => !_evaluatedConditions[name])
      ) {
        return {
          entry: state,
          history: _history,
          entryInHistory: _entryInHistory,
        };
      }

      return undefined;
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
    currentEntryName: string | undefined = undefined
  ): ExecuteResult | undefined => {
    const result = process(context, currentEntryName);

    if (!result) {
      return;
    }

    const { entry, entryInHistory, ...rest } = result;

    return { ...rest, entry: entryInHistory || entry };
  };

  return execute;
};

const isFork = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>
>(
  state: State<Context, Conditions>
): state is Fork<Context, Conditions> =>
  typeof state === "object" && state.hasOwnProperty("states");

const isEntry = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>
>(
  state: State<Context, Conditions>
): state is Entry<Context, Conditions> => !isFork(state);
