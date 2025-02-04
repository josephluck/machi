import {
  ConditionsMap,
  isEntryInternal,
  isForkInternal,
  State,
  StateInternal,
  uniquifyStates,
} from "../machine";
import {
  deduplicateLinks,
  filterInvalidLinks,
  getExistingSkippedForkLink,
  sortLinks,
  isGroup,
} from "./utils";

export enum REASONS {
  ENTRY_DONE = "ENTRY_DONE",
  FORK_ENTERED = "FORK_ENTERED",
  FORK_SKIPPED = "FORK_SKIPPED",
}

export type Group = {
  type: "group";
  end: boolean;
  id: string;
};

export type StateLink<
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
> = {
  type: "link";
  from: StateInternal<Context, Conditions, AdditionalEntryData>;
  to: StateInternal<Context, Conditions, AdditionalEntryData>;
  reason: REASONS;
};

export type Link<
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
> = Group | StateLink<Context, Conditions, AdditionalEntryData>;

/**
 * Takes a list of nested states and generates an array of links between states
 * in logical flow order. Takes that result and generates a mermaid-compatible
 * graph from them.
 */
export const generateStateLinks = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  states: State<Context, Conditions, AdditionalEntryData>[]
) => {
  const result: Link<Context, Conditions, AdditionalEntryData>[] = [];

  const run = (
    _states: StateInternal<Context, Conditions, AdditionalEntryData>[],
    /**
     * Keeps track of the parent's next state when a fork is entered, so all of
     * the final entries in the fork (and the nested forks) will successfully
     * link to the next logical state back up the tree.
     */
    nextStateInParentLevel?: StateInternal<
      Context,
      Conditions,
      AdditionalEntryData
    >
  ) => {
    _states.forEach((state, i) => {
      const nextState = _states.find(
        /**
         * This ensures that the next state link does not belong to the same
         * fork as the current fork (even though the machine will re-evaluate
         * sibling forks of the same id, their requirements should always be
         * mutually exclusive)
         */
        (s, ix) => ix > i && s._internalStateId !== state._internalStateId
      );
      if (isForkInternal(state)) {
        result.push({
          type: "link",
          from: state,
          to: state.states[0],
          reason: REASONS.FORK_ENTERED,
        });
        if (state.chartGroup) {
          result.push({
            type: "group",
            id: state.chartGroup,
            end: false,
          });
        }
        run(state.states, nextState || nextStateInParentLevel);

        // TODO: atm this group end is placed after link that the fork's
        // terminal states link to. It should really be before that link..
        if (state.chartGroup) {
          result.push({
            type: "group",
            id: state.chartGroup,
            end: true,
          });
        }
        if (nextState || nextStateInParentLevel) {
          const toState: StateInternal<
            Context,
            Conditions,
            AdditionalEntryData
          > = (nextState || nextStateInParentLevel)!;
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
            result.forEach((link) => {
              if (
                !isGroup(link) &&
                link.from._internalStateId === state._internalStateId &&
                link.to._internalStateId === toState._internalStateId &&
                link.reason === REASONS.FORK_SKIPPED &&
                isForkInternal(link.from)
              ) {
                // Make a deep(ish) copy of the state so we don't inadvertently
                // change the fork's entry links requirements
                link.from = {
                  ...link.from,
                  requirements: [
                    ...link.from.requirements,
                    ...state.requirements,
                  ],
                };
              }
            });
          } else if (toState) {
            result.push({
              type: "link",
              from: state,
              to: toState,
              reason: REASONS.FORK_SKIPPED,
            });
          }
        }
      }
      if (isEntryInternal(state) && state.isDone.length > 0) {
        if (nextState || nextStateInParentLevel) {
          result.push({
            type: "link",
            from: state,
            to: (nextState || nextStateInParentLevel)!,
            reason: REASONS.ENTRY_DONE,
          });
        }
      }
    });
  };

  const uniquedStates = uniquifyStates(states);

  run(uniquedStates);

  const deduplicatedResult = deduplicateLinks(result);
  const filteredLinks = filterInvalidLinks(uniquedStates, deduplicatedResult);
  const sortedLinks = sortLinks(filteredLinks);

  return sortedLinks;
};
