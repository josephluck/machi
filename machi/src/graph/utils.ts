import {
  isForkInternal,
  isEntryInternal,
  isConditionKey,
  Predicate,
  ConditionsMap,
  StateInternal,
  ForkInternal,
} from "../machine";
import { Group, Link, REASONS } from "./generate-state-links";

export const condNames = (conditions: (string | Predicate<any>)[]) =>
  conditions.map((cond) =>
    isConditionKey(cond) ? cond : cond.name || "unknown"
  );

export const toName = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  state: StateInternal<Context, Conditions, AdditionalEntryData> | undefined
) => (!state ? "undefined" : isForkInternal(state) ? state.fork : state.id);

export const stringifyToId = (str: string) =>
  str.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

/**
 * If found, will return the link in the list of provided links that is a
 * skipped fork where the fork has the same from and to.
 *
 * Used to combine the skipped conditions for forks that have multiple
 * destinations. If this isn't done then multiple links will exist per skipped
 * instance of a fork. Usually if the fork is binary, this isn't a problem.
 */
export const getExistingSkippedForkLink = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  result: Link<Context, Conditions, AdditionalEntryData>[],
  from: ForkInternal<Context, Conditions, AdditionalEntryData>,
  to: StateInternal<Context, Conditions, AdditionalEntryData>
): Link<Context, Conditions, AdditionalEntryData> | undefined =>
  result.find(
    (link) =>
      !isGroup(link) &&
      link.reason === REASONS.FORK_SKIPPED &&
      isForkInternal(from) &&
      link.from._internalStateId === from._internalStateId &&
      link.to._internalStateId === to._internalStateId
  );

/**
 * Takes a list of links and removes the duplicate links where the from, to and
 * reason are all identical
 */
export const deduplicateLinks = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  result: Link<Context, Conditions, AdditionalEntryData>[]
): Link<Context, Conditions, AdditionalEntryData>[] =>
  result
    .filter(
      (link) =>
        isGroup(link) || link.from._internalStateId !== link.to._internalStateId
    )
    .filter(
      (link, i: number, acc) =>
        isGroup(link) ||
        i ===
          acc.findIndex(
            (b) =>
              !isGroup(b) &&
              areStatesIdentical(link.from, b.from) &&
              areStatesIdentical(link.to, b.to) &&
              link.reason === b.reason
          )
    );

export const areStatesIdentical = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  stateA: StateInternal<Context, Conditions, AdditionalEntryData>,
  stateB: StateInternal<Context, Conditions, AdditionalEntryData>
) => {
  if (isForkInternal(stateA) && isEntryInternal(stateB)) {
    return false;
  }
  if (isEntryInternal(stateA) && isForkInternal(stateB)) {
    return false;
  }
  if (stateA._internalStateId !== stateB._internalStateId) {
    return false;
  }
  if (isForkInternal(stateA) && isForkInternal(stateB)) {
    return (
      condNames(stateA.requirements as string[]).join("") ===
      condNames(stateB.requirements as string[]).join("")
    );
  }
  if (isEntryInternal(stateA) && isEntryInternal(stateB)) {
    return (
      condNames(stateA.isDone as string[]).join("") ===
      condNames(stateB.isDone as string[]).join("")
    );
  }
  return false;
};

export const filterInvalidLinks = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  states: StateInternal<Context, Conditions, AdditionalEntryData>[],
  result: Link<Context, Conditions, AdditionalEntryData>[]
): Link<Context, Conditions, AdditionalEntryData>[] => {
  const orderedIds = accumulateStates(states).map((s) => s._internalStateId);
  return result.filter((link) => {
    if (isGroup(link)) {
      return true;
    }
    const fromIndex = orderedIds.indexOf(link.from._internalStateId);
    const toIndex = orderedIds.indexOf(link.to._internalStateId);
    return fromIndex >= 0 && toIndex >= 0 && fromIndex < toIndex;
  });
};

/**
 * Takes a list of potentially nested states (if forks are present) and returns
 * a flattened list of states in logical order.
 */
export const accumulateStates = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  states: StateInternal<Context, Conditions, AdditionalEntryData>[]
): StateInternal<Context, Conditions, AdditionalEntryData>[] =>
  states.reduce(
    (acc, state) =>
      isForkInternal(state)
        ? [...acc, state, ...accumulateStates(state.states)]
        : [...acc, state],
    [] as StateInternal<Context, Conditions, AdditionalEntryData>[]
  );

export const isGroup = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  link: Link<Context, Conditions, AdditionalEntryData>
): link is Group => link.type === "group";

export const sortLinks = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  links: Link<Context, Conditions, AdditionalEntryData>[]
): Link<Context, Conditions, AdditionalEntryData>[] =>
  links.sort((linkA, linkB) => {
    if (
      !isGroup(linkA) &&
      !isGroup(linkB) &&
      linkA.reason === REASONS.FORK_SKIPPED &&
      linkA.from._internalStateId === linkB.from._internalStateId
    ) {
      return 2;
    }

    return 1;
  });
