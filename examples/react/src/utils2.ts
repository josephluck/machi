import { isEntry, isFork, State } from "./lib/machine";
import {
  deduplicateResult,
  Link,
  REASONS,
  resultToMermaid,
  validateResult,
} from "./utils";

export const process = (states: State<any, any>[]) => {
  const result: Link[] = [];

  const run = (
    _states: State<any, any>[],
    nextStateInParentLevel?: State<any, any>
  ) => {
    _states.forEach((state, i) => {
      const nextState = _states[i + 1];
      if (isFork(state)) {
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
      if (isEntry(state) && state.isDone.length > 0) {
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

  run(states);

  const deduplicatedResult = deduplicateResult(result);

  const validatedResult = validateResult(states, deduplicatedResult);

  const mermaidLines = resultToMermaid(validatedResult);

  return `graph TD\n${mermaidLines.join("\n")}`;
};
