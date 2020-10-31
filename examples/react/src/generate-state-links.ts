import { isEntry, isFork, State } from "./lib/machine";
import {
  deduplicateLinks,
  Link,
  REASONS,
  linksToMermaid,
  filterInvalidLinks,
} from "./utils";

/**
 * Takes a list of nested states and generates an array of links between states
 * in logical flow order. Takes that result and generates a mermaid-compatible
 * graph from them.
 */
export const generateStateLinks = (states: State<any, any>[]) => {
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

  const deduplicatedResult = deduplicateLinks(result);

  return filterInvalidLinks(states, deduplicatedResult);
};

export const generateMermaid = (states: State<any, any>[]) => {
  const links = generateStateLinks(states);
  const mermaidLines = linksToMermaid(links);

  return `graph TD\n${mermaidLines.join("\n")}`;
};
