export type State<Context> = {
  name: string;
  cond: (state: Context) => boolean;
  states?: State<Context>[];
};

export const makeMachine = <Context extends any>(
  states: State<Context>[],
  context: Context
) => {
  type Cx = Context;
  type ExecuteResult = {
    state: State<Cx>;
    history: State<Cx>[];
  };
  type Er = ExecuteResult;

  const execute = (
    nextContext: Cx = context,
    _currentStateName: string | undefined = undefined,
    _states: State<Cx>[] = states,
    _history: State<Cx>[] = []
  ): Er | undefined => {
    const executed = _states.reduce(
      (prev: Er | undefined, state: State<Cx>) => {
        if (state.cond(nextContext)) {
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
