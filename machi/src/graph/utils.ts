import {
  State,
  isFork,
  isEntry,
  Fork,
  isConditionKey,
  Condition,
  Predicate,
} from "../machine";

export enum REASONS {
  ENTRY_DONE = "ENTRY_DONE",
  FORK_ENTERED = "FORK_ENTERED",
  FORK_SKIPPED = "FORK_SKIPPED",
}

type Group = {
  type: "group";
  end: boolean;
  id: string;
};

export type StateLinkNode<
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
> = { _machiChartId: string } & State<Context, Conditions, AdditionalEntryData>;

export type StateLink<
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
> = {
  type: "link";
  from: StateLinkNode<Context, Conditions, AdditionalEntryData>;
  to: StateLinkNode<Context, Conditions, AdditionalEntryData>;
  reason: REASONS;
};

export type Link<
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
> = Group | StateLink<Context, Conditions, AdditionalEntryData>;

export const linksToMermaid = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  result: Link<Context, Conditions, AdditionalEntryData>[]
) =>
  result.reduce<string[]>((prev, link) => {
    if (isGroup(link)) {
      const line = link.end
        ? "end"
        : `subgraph ${stringifyToId(link.id)} [${link.id}]`;
      return [...prev, line];
    }

    if (isFork(link.from)) {
      const fromId = link.from._machiChartId;
      const toId = link.to._machiChartId;
      const isAre = link.from.requirements.length > 1 ? "are" : "is";
      const truthy =
        link.reason === REASONS.FORK_ENTERED
          ? "true"
          : link.reason === REASONS.FORK_SKIPPED
          ? "false"
          : "unknown";
      const arrow = link.reason === REASONS.FORK_SKIPPED ? "-.->" : "-->";
      const reqs = `|${condNames(link.from.requirements as string[]).join(
        " and "
      )} ${isAre} ${truthy}|`;

      if (isEntry(link.to)) {
        const line = `${fromId} ${arrow} ${reqs} ${toId}[${link.to.id}]`;
        return [...prev, line];
      }
      if (isFork(link.to)) {
        const line = `${fromId} ${arrow} ${reqs} ${toId}{${link.to!.fork}}`;
        return [...prev, line];
      }
      return prev;
    }

    const fromId = link.from._machiChartId;
    const toId = link.to._machiChartId;
    const isAre = link.from.isDone.length > 1 ? "are" : "is";
    if (isEntry(link.to)) {
      const reqs = `|${condNames(link.from.isDone as string[]).join(
        " and "
      )} ${isAre} true|`;
      const line = `${fromId}[${link.from.id}] --> ${reqs} ${toId}[${link.to.id}]`;
      return [...prev, line];
    }
    if (isFork(link.to)) {
      const reqs = `|${condNames(link.from.isDone as string[]).join(
        " and "
      )} ${isAre} true|`;
      const line = `${fromId}[${link.from.id}] --> ${reqs} ${toId}{${
        link.to!.fork
      }}`;
      return [...prev, line];
    }
    return prev;
  }, []);

export const condNames = (conditions: (string | Predicate<any>)[]) =>
  conditions.map((cond) =>
    isConditionKey(cond) ? cond : cond.name || "unknown"
  );

export const makeId = (state: State<any, any, {}> | undefined) =>
  !state
    ? "undefined"
    : isFork(state)
    ? stringifyToId(state.fork)
    : stringifyToId(state.id);

export const toName = (state: State<any, any, {}> | undefined) =>
  !state ? "undefined" : isFork(state) ? state.fork : state.id;

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
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  result: Link<Context, Conditions, AdditionalEntryData>[],
  from: Fork<any, any, {}>,
  to: State<any, any, {}>
): Link<Context, Conditions, AdditionalEntryData> | undefined =>
  result.find(
    (link) =>
      !isGroup(link) &&
      link.reason === REASONS.FORK_SKIPPED &&
      isFork(from) &&
      makeId(link.from) === makeId(from) &&
      makeId(link.to) === makeId(to)
  );

/**
 * Takes a list of links and removes the duplicate links where the from, to and
 * reason are all identical
 */
export const deduplicateLinks = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  result: Link<Context, Conditions, AdditionalEntryData>[]
): Link<Context, Conditions, AdditionalEntryData>[] =>
  result
    .filter((link) => isGroup(link) || makeId(link.from) !== makeId(link.to))
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

export const areStatesIdentical = (
  stateA: State<any, any, {}>,
  stateB: State<any, any, {}>
) => {
  if (isFork(stateA) && isEntry(stateB)) {
    return false;
  }
  if (isEntry(stateA) && isFork(stateB)) {
    return false;
  }
  if (makeId(stateA) !== makeId(stateB)) {
    return false;
  }
  if (isFork(stateA) && isFork(stateB)) {
    return (
      condNames(stateA.requirements as string[]).join("") ===
      condNames(stateB.requirements as string[]).join("")
    );
  }
  if (isEntry(stateA) && isEntry(stateB)) {
    return (
      condNames(stateA.isDone).join("") === condNames(stateB.isDone).join("")
    );
  }
  return false;
};

export const filterInvalidLinks = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  states: State<Context, Conditions, AdditionalEntryData>[],
  result: Link<Context, Conditions, AdditionalEntryData>[]
): Link<Context, Conditions, AdditionalEntryData>[] => {
  const orderedIds = accumulateStates(states).map(makeId);
  return result.filter((link) => {
    if (isGroup(link)) {
      return true;
    }
    const fromIndex = orderedIds.indexOf(makeId(link.from));
    const toIndex = orderedIds.indexOf(makeId(link.to));
    return fromIndex >= 0 && toIndex >= 0 && fromIndex < toIndex;
  });
};

/**
 * Takes a list of potentially nested states (if forks are present) and returns
 * a flattened list of states in logical order.
 */
export const accumulateStates = (
  states: State<any, any, {}>[]
): State<any, any, {}>[] =>
  states.reduce(
    (acc, state) =>
      isFork(state)
        ? [...acc, state, ...accumulateStates(state.states)]
        : [...acc, state],
    [] as State<any, any, {}>[]
  );

export const isGroup = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  link: Link<Context, Conditions, AdditionalEntryData>
): link is Group => link.type === "group";

export const sortLinks = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  links: Link<Context, Conditions, AdditionalEntryData>[]
): Link<Context, Conditions, AdditionalEntryData>[] =>
  links.sort((linkA, linkB) => {
    if (
      !isGroup(linkA) &&
      !isGroup(linkB) &&
      linkA.reason === REASONS.FORK_SKIPPED &&
      makeId(linkA.from) === makeId(linkB.from)
    ) {
      return 2;
    }

    return 1;
  });
