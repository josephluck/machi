import { isEntry, isFork, State } from "../machine";
import {
  deduplicateLinks,
  Link,
  REASONS,
  linksToMermaid,
  filterInvalidLinks,
  toName,
  makeId,
  getExistingSkippedForkLink,
} from "./utils";

/**
 * Takes a list of nested states and generates an array of links between states
 * in logical flow order. Takes that result and generates a mermaid-compatible
 * graph from them.
 */
export const generateStateLinks = (states: State<any, any, {}>[]) => {
  const result: Link[] = [];

  const run = (
    _states: State<any, any, {}>[],
    /**
     * Keeps track of the parent's next state when a fork is entered, so all of
     * the final entries in the fork (and the nested forks) will successfully
     * link to the next logical state back up the tree.
     */
    nextStateInParentLevel?: State<any, any, {}>
  ) => {
    _states.forEach((state, i) => {
      const nextState = _states.find(
        /**
         * This ensures that the next state link does not belong to the same
         * fork as the current fork (even though the machine will re-evaluate
         * sibling forks of the same name, their requirements should always be
         * mutually exclusive)
         */
        (s, ix) => ix > i && makeId(s) !== makeId(state)
      );
      if (isFork(state)) {
        result.push({
          from: state,
          to: state.states[0],
          reason: REASONS.FORK_ENTERED,
        });
        run(state.states, nextState || nextStateInParentLevel);
        if (nextState || nextStateInParentLevel) {
          const toState = nextState || nextStateInParentLevel;
          const existingSkippedFork = getExistingSkippedForkLink(
            result,
            state,
            toState
          );

          if (existingSkippedFork) {
            // There's already a skipped link for this fork, so we need to prevent
            // duplicating the link, but retain all the necessary requirements
            // for skipping the fork (these become "and false" conditions for
            // skipping as the combination of all the falsy entry conditions are
            // the skip condition for the fork.
            // TODO: this link would be best moved towards the end of the entered
            // links as the graph looks strange otherwise.
            // do the re-ordering once the generation is done though rather than
            // complicating this part.
            result.forEach((link) => {
              if (
                makeId(link.from) === makeId(state) &&
                makeId(link.to) === makeId(toState) &&
                link.reason === REASONS.FORK_SKIPPED
              ) {
                link.from.requirements.push(...state.requirements);
              }
            });
          } else {
            result.push({
              from: state,
              to: toState,
              reason: REASONS.FORK_SKIPPED,
            });
          }
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

export const generateMermaid = (states: State<any, any, {}>[]) => {
  const links = generateStateLinks(states);
  const mermaidLines = linksToMermaid(links);

  return `graph TD\n${mermaidLines.join("\n")}`;
};
