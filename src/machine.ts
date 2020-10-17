type State<Context> = {
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
    _states: State<Cx>[] = states,
    _history: State<Cx>[] = []
  ): Er | undefined => {
    return _states.reduce((prev: Er | undefined, state: State<Cx>) => {
      if (state.cond(nextContext)) {
        const prevHistory = prev ? prev.history : _history;
        const history = [...prevHistory, state];
        if (state.states) {
          return execute(nextContext, state.states, history);
        }
        return { state, history };
      }
      return prev;
    }, undefined);
  };

  return {
    execute,
    initial: execute(context),
  };
};
