import {
  State,
  Condition,
  makeMachine,
  Fork,
  isFork,
  isEntry,
  HistoryState,
} from "./lib/machine";
import { deduplicateResult, Link, REASONS, resultToMermaid } from "./utils";

export const process = (
  states: State<any, any>[],
  conditions: Record<string, Condition<any>>
) => {
  const execute = makeMachine(states, conditions);
  const result: Link[] = [];
  /**
   * TODO: currently the graph includes states that may not
   * be possible, although it flows through in logical order.
   *
   * We can fix this by capturing all possibilities of a fork
   * and then checking whether what we are about to push in to
   * the result is a valid path by predicating that the `to` is
   * after the `from` in any of the histories.
   */
  const histories: HistoryState<any, any>[] = [];

  const run = (
    _states: State<any, any>[],
    nextStateInParentLevel?: State<any, any>
  ) => {
    _states.forEach((state, i) => {
      const prevState = _states[i - 1];
      const nextState = _states[i + 1];
      if (isFork(state)) {
        if (prevState) {
          // result.push({
          //   from: prevState,
          //   to: state,
          //   reason: REASONS.ENTRY_DONE,
          // });
        }
        result.push({
          from: state,
          to: state.states[0],
          reason: REASONS.FORK_ENTERED,
        });
        run(state.states, nextState || nextStateInParentLevel);
        if (nextState || nextStateInParentLevel) {
          result.push({
            from: state,
            to: nextState || nextStateInParentLevel,
            reason: REASONS.FORK_SKIPPED,
          });
        }
      }
      if (isEntry(state)) {
        if (nextState || nextStateInParentLevel) {
          result.push({
            from: state,
            to: nextState || nextStateInParentLevel,
            reason: REASONS.ENTRY_DONE,
          });
        }
      }
    });
  };

  // const initialCtx = Object.entries(conditions).reduce(
  //   (acc, [name]) => ({ ...acc, [name]: false }),
  //   {}
  // );

  run(states);

  const res = deduplicateResult(result);
  console.log(res);

  return `graph TD\n${resultToMermaid(res).join("\n")}`;
};
