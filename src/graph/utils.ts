import { State, isFork, isEntry } from "../machine";

export enum REASONS {
  ENTRY_DONE = "ENTRY_DONE",
  FORK_ENTERED = "FORK_ENTERED",
  FORK_SKIPPED = "FORK_SKIPPED",
}

export type Link = {
  from: State<any, any, any>;
  to: State<any, any, any>;
  reason: REASONS;
};

export const linksToMermaid = (result: Link[]) =>
  result.reduce((prev: any, link) => {
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
      const reqs = `|${link.from.requirements.join(
        " and "
      )} ${isAre} ${truthy}|`;

      if (isEntry(link.to)) {
        const line = `${fromId} --> ${reqs} ${toId}[${link.to.name}]`;
        return [...prev, line];
      }
      if (isFork(link.to)) {
        const line = `${fromId} --> ${reqs} ${toId}{${link.to!.fork}}`;
        return [...prev, line];
      }
      return prev;
    }

    if (isEntry(link.from)) {
      const fromId = makeId(link.from);
      const toId = makeId(link.to);
      const isAre = link.from.isDone.length > 1 ? "are" : "is";
      if (isEntry(link.to)) {
        const reqs = `|${link.from.isDone.join(" and ")} ${isAre} true|`;
        const line = `${fromId}[${link.from.name}] --> ${reqs} ${toId}[${link.to.name}]`;
        return [...prev, line];
      }
      if (isFork(link.to)) {
        const reqs = `|${link.from.isDone.join(" and ")} ${isAre} true|`;
        const line = `${fromId}[${link.from.name}] --> ${reqs} ${toId}{${
          link.to!.fork
        }}`;
        return [...prev, line];
      }
      return prev;
    }
  }, []);

export const makeId = (state: State<any, any, any> | undefined) =>
  !state ? "undefined" : isFork(state) ? toId(state.fork) : toId(state.name);

export const toName = (state: State<any, any, any> | undefined) =>
  !state ? "undefined" : isFork(state) ? state.fork : state.name;

const toId = (str: string) => str.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

/**
 * Takes a list of links and removes the duplicate links where the from, to and
 * reason are all identical
 */
export const deduplicateLinks = (result: Link[]): Link[] =>
  result
    .filter((link) => makeId(link.from) !== makeId(link.to))
    .filter(
      (link, i: number, acc) =>
        i ===
        acc.findIndex(
          (b) =>
            makeId(link.from) === makeId(b.from) &&
            makeId(link.to) === makeId(b.to) &&
            link.reason === b.reason
        )
    );

export const filterInvalidLinks = (
  states: State<any, any, any>[],
  result: Link[]
): Link[] =>
  result.filter((link) => {
    const orderedIds = accumulateStates(states).map(makeId);
    const fromIndex = orderedIds.indexOf(makeId(link.from));
    const toIndex = orderedIds.indexOf(makeId(link.to));
    return fromIndex >= 0 && toIndex >= 0 && fromIndex < toIndex;
  });

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
