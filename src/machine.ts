/**
 * An entry within the flow
 */
export type State<
  Context,
  Conditions extends Record<string, Condition<Context>>
> = {
  /**
   * The name of the state. Must be unique within the context of an entire
   * machine in order for correct execution behaviour when traversing history
   * from an earlier point in the flow.
   * For example, if the machine is modelling a navigation journey, the user may
   * navigate to an earlier point in the flow in which case, when they execute,
   * they should traverse forwards visiting the states they navigated back
   * through in the same order (providing they have not updated the context such
   * that the conditions take them through a different journey).
   */
  name: string;
  /**
   * An array of strings corresponding to a pre-specified condition name.
   * Conditions are evaluated during execution, and are used to determine which
   * path the execution will take depending on the current context.
   */
  cond: (keyof Conditions)[];
  /**
   * The child states of this state.
   */
  states?: State<Context, Conditions>[];
};

/**
 * A predicate based on the machine's context
 */
type Condition<Context> = (context: Context) => boolean;

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
    state: State<Cx, Cd>;
    history: State<Cx, Cd>[];
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
    _history: State<Cx, Cd>[] = [],
    /**
     * INTERNAL USE ONLY
     * Used as a cache of the condition results based on the next context so
     * that the conditions aren't re-evaluated during recursion.
     */
    _evaluatedConditions = evaluateConditions(nextContext)
  ): Er | undefined => {
    const executed = _states.reduce(
      (prev: Er | undefined, state: State<Cx, Cd>) => {
        const conditionPassed = state.cond.every(
          (cond) => _evaluatedConditions[cond]
        );
        if (conditionPassed) {
          const prevHistory = prev ? prev.history : _history;
          const history = [...prevHistory, state];
          if (state.states) {
            return execute(
              nextContext,
              currentStateName,
              state.states,
              history,
              _evaluatedConditions
            );
          }
          return { state, history };
        }
        return prev;
      },
      undefined
    );
    const ixCurState =
      executed && currentStateName
        ? executed.history.findIndex((state) => state.name === currentStateName)
        : -1;
    if (ixCurState > -1) {
      const nextStateInHistory =
        executed && executed.history[ixCurState + 1]
          ? executed.history[ixCurState + 1]
          : undefined;
      return executed
        ? { ...executed, state: nextStateInHistory || executed.state }
        : undefined;
    }
    return executed;
  };

  return {
    execute,
    initial: execute(context),
  };
};
