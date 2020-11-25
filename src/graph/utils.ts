import { State, isFork, isEntry, Fork, isConditionKey } from "../machine";

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

export type Link =
  | Group
  | {
      type: "link";
      from: State<any, any, any>;
      to: State<any, any, any>;
      reason: REASONS;
    };

export const linksToMermaid = (result: Link[]) =>
  result.reduce((prev: any, link) => {
    if (isGroup(link)) {
      const line = link.end ? "end" : `subgraph ${toId(link.id)} [${link.id}]`;
      return [...prev, line];
    }
    if (isFork(link.from)) {
      const fromId = makeId(link.from);
      const toId = makeId(link.to);
      const isAre = link.from.requirements.length > 1 ? "are" : "is";
      const truthy =
        link.reason === REASONS.FORK_ENTERED
          ? "true"
          : link.reason === REASONS.FORK_SKIPPED
          ? "false"
          : "unknown";
      const arrow = link.reason === REASONS.FORK_SKIPPED ? "-.->" : "-->";
      const reqs = `|${condNames(link.from.requirements).join(
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

    if (isEntry(link.from)) {
      const fromId = makeId(link.from);
      const toId = makeId(link.to);
      const isAre = link.from.isDone.length > 1 ? "are" : "is";
      if (isEntry(link.to)) {
        const reqs = `|${condNames(link.from.isDone).join(
          " and "
        )} ${isAre} true|`;
        const line = `${fromId}[${link.from.id}] --> ${reqs} ${toId}[${link.to.id}]`;
        return [...prev, line];
      }
      if (isFork(link.to)) {
        const reqs = `|${condNames(link.from.isDone).join(
          " and "
        )} ${isAre} true|`;
        const line = `${fromId}[${link.from.id}] --> ${reqs} ${toId}{${
          link.to!.fork
        }}`;
        return [...prev, line];
      }
      return prev;
    }
  }, []);

export const condNames = (conditions: (string | ((ctx: any) => boolean))[]) =>
  conditions.map((cond) =>
    isConditionKey(cond) ? cond : cond.name || "anonymousFunction"
  );

export const makeId = (state: State<any, any, any> | undefined) =>
  !state ? "undefined" : isFork(state) ? toId(state.fork) : toId(state.id);

export const toName = (state: State<any, any, any> | undefined) =>
  !state ? "undefined" : isFork(state) ? state.fork : state.id;

export const toId = (str: string) =>
  str.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

/**
 * If found, will return the link in the list of provided links that is a
 * skipped fork where the fork has the same from and to.
 *
 * Used to combine the skipped conditions for forks that have multiple
 * destinations. If this isn't done then multiple links will exist per skipped
 * instance of a fork. Usually if the fork is binary, this isn't a problem.
 */
export const getExistingSkippedForkLink = (
  result: Link[],
  from: Fork<any, any, any>,
  to: State<any, any, any>
): Link | undefined =>
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
export const deduplicateLinks = (result: Link[]): Link[] =>
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
  stateA: State<any, any, any>,
  stateB: State<any, any, any>
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
      condNames(stateA.requirements).join("") ===
      condNames(stateB.requirements).join("")
    );
  }
  if (isEntry(stateA) && isEntry(stateB)) {
    return (
      condNames(stateA.isDone).join("") === condNames(stateB.isDone).join("")
    );
  }
  return false;
};

export const filterInvalidLinks = (
  states: State<any, any, any>[],
  result: Link[]
): Link[] => {
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
  states: State<any, any, any>[]
): State<any, any, any>[] =>
  states.reduce(
    (acc, state) =>
      isFork(state)
        ? [...acc, state, ...accumulateStates(state.states)]
        : [...acc, state],
    [] as State<any, any, any>[]
  );

export const isGroup = (link: Link): link is Group => link.type === "group";

export const sortLinks = (links: Link[]): Link[] =>
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
