import {
  State,
  Condition,
  makeMachine,
  isFork,
  isEntry,
  HistoryState,
  Entry,
} from "./lib/machine";

export enum REASONS {
  ENTRY_DONE = "ENTRY_DONE",
  FORK_ENTERED = "FORK_ENTERED",
  FORK_SKIPPED = "FORK_SKIPPED",
}

export type Link = {
  from: State<any, any>;
  to: State<any, any>;
  reason: REASONS;
};

export const process = (
  states: State<any, any>[],
  conditions: Record<string, Condition<any>>
) => {
  const execute = makeMachine(states, conditions);
  const result: Link[] = [];

  const run = (_states: State<any, any>[], levelCtx: any) => {
    _states.forEach((state) => {
      if (isFork(state)) {
        const truthyCtx = { ...levelCtx };
        const falsyCtx = { ...levelCtx };
        state.requirements.forEach((cond) => {
          truthyCtx[cond] = true;
          falsyCtx[cond] = false;
        });
        const enteredFork = execute({}, undefined, states, [], truthyCtx);
        const skippedFork = execute({}, undefined, states, [], falsyCtx);

        if (enteredFork) {
          result.push(
            ...getHistoryLinks(enteredFork.history, enteredFork.entry)
          );
          run(state.states, truthyCtx);
        }

        if (skippedFork) {
          result.push(
            ...getHistoryLinks(skippedFork.history, skippedFork.entry)
          );
          run(state.states, falsyCtx);
        }
      }

      if (isEntry(state)) {
        state.isDone.forEach((cond) => {
          levelCtx[cond] = true;
        });
        const next = execute({}, undefined, states, [], levelCtx);

        if (next) {
          result.push(...getHistoryLinks(next.history, next.entry));
          // result.push({
          //   from: state,
          //   to: next.entry,
          //   reason: REASONS.ENTRY_DONE,
          // });
        }
      }
    });
  };

  const initialCtx = Object.entries(conditions).reduce(
    (acc, [name]) => ({ ...acc, [name]: false }),
    {}
  );

  run(states, initialCtx);

  const normalisedResult = deduplicateResult(result);

  const lines = resultToMermaid(normalisedResult);

  console.log(
    normalisedResult.map((line: any) => ({
      ...line,
      from: toName(line.from),
      to: toName(line.to),
    }))
  );

  const mermaid = lines
    .reduce(
      (acc: any, line: any) => (acc.includes(line) ? acc : [...acc, line]),
      []
    )
    .join("\n");

  console.log(mermaid);

  return `graph TD\n${mermaid}`;
};

export const resultToMermaid = (result: Link[]) =>
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
        const line = `${fromId} --> ${reqs} ${toId}{${link.to.fork}}`;
        return [...prev, line];
      }
      return prev;
    }

    if (isEntry(link.from)) {
      const fromId = makeId(link.from);
      const toId = makeId(link.to);
      const isAre = link.from.isDone.length > 1 ? "are" : "is";
      if (isEntry(link.to)) {
        const reqs = `|${link.from.isDone.join(" and ")} ${isAre} true b|`;
        const line = `${fromId}[${link.from.name}] --> ${reqs} ${toId}[${link.to.name}]`;
        return [...prev, line];
      }
      if (isFork(link.to)) {
        const reqs = `|${link.from.isDone.join(" and ")} ${isAre} true c|`;
        const line = `${fromId}[${link.from.name}] --> ${reqs} ${toId}{${link.to.fork}}`;
        return [...prev, line];
      }
      return prev;
    }
  }, []);

export const getHistoryLinks = (
  history: HistoryState<any, any>[],
  entry?: Entry<any, any>
  // skipped: boolean,
  // ctx: any
) => {
  const result: any = [];
  history.forEach((historyState, i) => {
    const prevHistoryState = history[i - 1];
    const nextHistoryState = history[i + 1];

    if (isFork(historyState)) {
      if (prevHistoryState) {
        result.push({
          from: prevHistoryState,
          to: historyState,
          reason: historyState.skipped
            ? REASONS.FORK_SKIPPED
            : REASONS.FORK_ENTERED,
        });
      }
      if (nextHistoryState) {
        result.push({
          from: historyState,
          to: nextHistoryState,
          reason: historyState.skipped
            ? REASONS.FORK_SKIPPED
            : REASONS.FORK_ENTERED,
        });
      }
    }

    if (isEntry(historyState)) {
      if (prevHistoryState) {
        result.push({
          from: prevHistoryState,
          to: historyState,
          reason: isEntry(prevHistoryState)
            ? REASONS.ENTRY_DONE
            : prevHistoryState.skipped
            ? REASONS.FORK_SKIPPED
            : REASONS.FORK_ENTERED,
        });
      }
      if (nextHistoryState) {
        result.push({
          from: historyState,
          to: nextHistoryState,
          reason: isEntry(nextHistoryState)
            ? REASONS.ENTRY_DONE
            : nextHistoryState.skipped
            ? REASONS.FORK_SKIPPED
            : REASONS.FORK_ENTERED,
        });
      }
    }

    if (!nextHistoryState && entry) {
      result.push({
        from: historyState,
        to: entry,
        reason: isEntry(historyState)
          ? REASONS.ENTRY_DONE
          : historyState.skipped
          ? REASONS.FORK_SKIPPED
          : REASONS.FORK_ENTERED,
      });
    }
  });

  console.log([...history, entry]);

  return result;
};

export const makeId = (state: State<any, any> | undefined) =>
  !state ? "undefined" : isFork(state) ? toId(state.fork) : toId(state.name);

export const toName = (state: State<any, any> | undefined) =>
  !state ? "undefined" : isFork(state) ? state.fork : state.name;

const toId = (str: string) => str.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

export const deduplicateResult = (result: Link[]): Link[] =>
  result
    .filter((line: any) => makeId(line.from) !== makeId(line.to))
    .filter((a: any, i: number, self: any) => {
      return (
        i ===
        self.findIndex((b: any) => {
          return (
            makeId(a.from) === makeId(b.from) &&
            makeId(a.to) === makeId(b.to) &&
            a.reason === b.reason
          );
        })
      );
    });

export const validateResult = (
  states: State<any, any>[],
  result: Link[]
): Link[] =>
  result.filter((link) => {
    const orderedIds = accumulateStates(states).map(makeId);
    const fromIndex = orderedIds.indexOf(makeId(link.from));
    const toIndex = orderedIds.indexOf(makeId(link.to));
    return fromIndex >= 0 && toIndex >= 0 && fromIndex < toIndex;
  });

export const accumulateStates = (
  states: State<any, any>[]
): State<any, any>[] =>
  states.reduce(
    (acc, state) =>
      isFork(state)
        ? [...acc, state, ...accumulateStates(state.states)]
        : [...acc, state],
    [] as State<any, any>[]
  );
