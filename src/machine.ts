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
  Context extends any,
  Conditions extends Record<string, Condition<Context>>
>(
  /**
   * The states in the machine.
   */
  states: State<Context, Conditions>[],
  /**
   * The initial context of the machine.
   */
  context: Context,
  /**
   * The condition functions (used by states) of the machine. States in the
   * machine can refer to condition functions by their key in this object as
   * entry requirements for the state.
   */
  conditions: Conditions
) => {
  type Cd = Conditions;
  type ConditionsResult = Record<keyof Conditions, boolean>;
  type CdR = ConditionsResult;
  type Cx = Context;
  type ExecuteResult = {
    entry: Entry<Cx, Cd>;
    history: Entry<Cx, Cd>[];
  };
  type Er = ExecuteResult;

  const evaluateConditions = (nextContext: Cx) =>
    Object.entries(conditions).reduce(
      (acc, [c, cond]): CdR => ({
        ...acc,
        [c]: cond(nextContext),
      }),
      {} as CdR
    );

  const process = (
    nextContext: Cx = context,
    currentStateName: string | undefined = undefined,
    /**
     * INTERNAL USE ONLY
     * The states to evaluate. Used when recursing over states in the machine.
     */
    _states: State<Cx, Cd>[] = states,
    /**
     * INTERNAL USE ONLY
     * Used when recursing over states whose conditions return truthy (aka the
     * states that have been "visited" on the way to the final state) to build
     * up the pathway of visited states during execution.
     */
    _history: Entry<Cx, Cd>[] = [],
    /**
     * INTERNAL USE ONLY
     * Used as a cache of the condition results based on the next context so
     * that the conditions aren't re-evaluated during recursion.
     */
    _evaluatedConditions = evaluateConditions(nextContext),
    _entryInHistory: Entry<Cx, Cd> | undefined = undefined
  ): (Er & { entryInHistory: Entry<Cx, Cd> | undefined }) | undefined => {
    const result = _states.reduce((prev, state) => {
      const pushEntryToHistory = () => {
        if (
          isEntry<Cx, Cd>(state) &&
          state.isDone.every((cond) => _evaluatedConditions[cond])
        ) {
          _history.push(state);
        }
      };

      if (
        isFork<Cx, Cd>(state) &&
        state.requirements.every((cond) => _evaluatedConditions[cond])
      ) {
        return process(
          nextContext,
          currentStateName,
          state.states,
          _history,
          _evaluatedConditions,
          _entryInHistory
        );
      }

      // Found path
      if (prev) {
        if (currentStateName && _history.length) {
          const nextIndexInHistory = _history.findIndex(
            (entry) => entry.name === currentStateName
          );
          const entryInHistory = _history[nextIndexInHistory + 1];

          return entryInHistory ? { ...prev, entryInHistory } : prev;
        }

        return prev;
      }

      pushEntryToHistory();

      if (
        isEntry<Cx, Cd>(state) &&
        state.isDone.some((cond) => !_evaluatedConditions[cond])
      ) {
        return {
          entry: state,
          history: _history,
          entryInHistory: _entryInHistory,
        };
      }

      return undefined;
    }, undefined as (Er & { entryInHistory: Entry<Cx, Cd> | undefined }) | undefined);

    return result;
  };

  const execute = (
    /**
     * The next machine context. Passed to conditions
     */
    nextContext: Cx = context,
    /**
     * Used to determine whether to preserve the history and navigate to the
     * next entry. Used when the current state is somewhere back in the history
     * stack. For example, the user has navigated back to an earlier point in
     * a navigation flow and is updating information (they should go forwards in
     * the same order as they went back, unless they end up changing state entry
     * requirements via data-driven conditions).
     */
    currentStateName: string | undefined = undefined
  ): Er | undefined => {
    const result = process(nextContext, currentStateName);

    if (!result) {
      return;
    }

    const { entry, history, entryInHistory } = result;

    return { entry: entryInHistory || entry, history };
  };

  // const execute = (
  //   /**
  //    * The next machine context. Passed to conditions
  //    */
  //   nextContext: Cx = context,
  //   /**
  //    * Used to determine whether to preserve the history and navigate to the
  //    * next entry. Used when the current state is somewhere back in the history
  //    * stack. For example, the user has navigated back to an earlier point in
  //    * a navigation flow and is updating information (they should go forwards in
  //    * the same order as they went back, unless they end up changing state entry
  //    * requirements via data-driven conditions).
  //    */
  //   currentStateName: string | undefined = undefined,
  //   /**
  //    * INTERNAL USE ONLY
  //    * The states to evaluate. Used when recursing over states in the machine.
  //    */
  //   _states: State<Cx, Cd>[] = states,
  //   /**
  //    * INTERNAL USE ONLY
  //    * Used when recursing over states whose conditions return truthy (aka the
  //    * states that have been "visited" on the way to the final state) to build
  //    * up the pathway of visited states during execution.
  //    */
  //   _history: State<Cx, Cd>[] = [],
  //   /**
  //    * INTERNAL USE ONLY
  //    * Used as a cache of the condition results based on the next context so
  //    * that the conditions aren't re-evaluated during recursion.
  //    */
  //   _evaluatedConditions = evaluateConditions(nextContext)
  // ): Er | undefined => {
  //   const executed = _states.reduce(
  //     (prev: Er | undefined, state: State<Cx, Cd>) => {
  //       const conditionPassed = state.cond.every(
  //         (cond) => _evaluatedConditions[cond]
  //       );
  //       if (conditionPassed) {
  //         const prevHistory = prev ? prev.history : _history;
  //         const history = [...prevHistory, state];
  //         if (state.states) {
  //           return execute(
  //             nextContext,
  //             currentStateName,
  //             state.states,
  //             history,
  //             _evaluatedConditions
  //           );
  //         }
  //         return { entry: state, history };
  //       }
  //       return prev;
  //     },
  //     undefined
  //   );

  //   const ixCurState =
  //     executed && currentStateName
  //       ? executed.history.findIndex((state) => state.name === currentStateName)
  //       : -1;
  //   if (ixCurState > -1) {
  //     const nextEntry =
  //       executed && executed.history[ixCurState + 1]
  //         ? executed.history[ixCurState + 1]
  //         : undefined;
  //     return executed
  //       ? { ...executed, entry: nextEntry || executed.entry }
  //       : undefined;
  //   }
  //   return executed;
  // };

  return {
    execute,
    initial: execute(context),
  };
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
