export type State<
  Context,
  Conditions extends Record<string, Condition<Context>>
> = {
  name: string;
  cond: (keyof Conditions)[];
  states?: State<Context, Conditions>[];
};

type Condition<Context> = (context: Context) => boolean;

export const makeMachine = <
  Context extends any,
  Conditions extends Record<string, Condition<Context>>
>(
  states: State<Context, Conditions>[],
  context: Context,
  conditions: Conditions
) => {
  type Cd = Conditions;
  type Cx = Context;
  type ExecuteResult = {
    state: State<Cx, Cd>;
    history: State<Cx, Cd>[];
  };
  type Er = ExecuteResult;

  const execute = (
    nextContext: Cx = context,
    _currentStateName: string | undefined = undefined,
    _states: State<Cx, Cd>[] = states,
    _history: State<Cx, Cd>[] = []
  ): Er | undefined => {
    const evaluatedConditions = Object.entries(conditions).reduce(
      (acc, [condition, fn]): Record<keyof Conditions, boolean> => {
        return {
          ...acc,
          [condition]: fn(nextContext),
        };
      },
      {} as Record<keyof Conditions, boolean>
    );
    const executed = _states.reduce(
      (prev: Er | undefined, state: State<Cx, Cd>) => {
        const conditionPassed = state.cond.every(
          (cond) => evaluatedConditions[cond]
        );
        if (conditionPassed) {
          const prevHistory = prev ? prev.history : _history;
          const history = [...prevHistory, state];
          if (state.states) {
            return execute(
              nextContext,
              _currentStateName,
              state.states,
              history
            );
          }
          return { state, history };
        }
        return prev;
      },
      undefined
    );
    const ixCurState =
      executed && _currentStateName
        ? executed.history.findIndex(
            (state) => state.name === _currentStateName
          )
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
