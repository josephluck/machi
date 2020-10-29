import React from "react";
import ReactDOM from "react-dom";
import {
  State,
  Condition,
  isFork,
  makeMachine,
  isEntry,
  Entry,
  Fork,
  HistoryState,
} from "./lib/machine";
import Mermaid from "react-mermaid2";

const beerStates: State<any, any>[] = [
  {
    name: "Age?",
    isDone: ["hasEnteredAge"],
  },
  {
    fork: "Old enough?",
    requirements: ["isOfLegalDrinkingAge"],
    states: [
      { name: "Name?", isDone: ["hasEnteredName"] },
      { name: "Postcode?", isDone: ["hasEnteredAddress"] },
      {
        fork: "Manual address",
        requirements: ["enteringAddressManually"],
        states: [
          {
            name: "Address?",
            isDone: ["hasEnteredAddress"],
          },
        ],
      },
      { name: "Job title?", isDone: ["hasEnteredJobTitle"] },
      { name: "Salary?", isDone: ["hasEnteredSalary"] },
      {
        fork: "Too rich?",
        requirements: ["isRich"],
        states: [
          {
            name: "Too rich",
            isDone: ["no"],
          },
        ],
      },
      { name: "Free beer", isDone: ["no"] },
    ],
  },
  {
    fork: "Old enough?",
    requirements: ["isTooYoung"],
    states: [{ name: "Too young", isDone: ["no"] }],
  },
];

const beerConditions: Record<string, Condition<any>> = {
  no: () => false,
  hasEnteredAge: (ctx) => !!ctx.age,
  hasEnteredName: (ctx) => !!ctx.name && ctx.name.length > 0,
  hasEnteredAddress: (ctx) => !!ctx.address,
  hasEnteredJobTitle: (ctx) => !!ctx.jobTitle,
  hasEnteredSalary: (ctx) => !!ctx.salary,
  isOfLegalDrinkingAge: (ctx) => !!ctx.age && ctx.age >= 18,
  isTooYoung: (ctx) => !!ctx.age && ctx.age < 18,
  isRich: (ctx) => !!ctx.salary && ctx.salary > 100000,
  isEligible: (ctx) => !!ctx.salary && ctx.salary > 100000,
  enteringAddressManually: (ctx) => ctx.bypassPostcodeLookup,
};

const simpleStates: State<any, any>[] = [
  { name: "first", isDone: ["first"] },
  { name: "second", isDone: ["first", "second"] },
  { name: "third", isDone: ["third"] },
  {
    fork: "horizontal",
    requirements: ["left"],
    states: [
      { name: "left/red", isDone: ["red"] },
      { name: "left/green", isDone: ["green"] },
      { name: "left/blue", isDone: ["blue"] },
    ],
  },
  {
    fork: "horizontal",
    requirements: ["right"],
    states: [
      { name: "right/red", isDone: ["red"] },
      { name: "right/green", isDone: ["green"] },
      { name: "right/blue", isDone: ["blue"] },
    ],
  },
  {
    fork: "vertical",
    requirements: ["up"],
    states: [
      {
        fork: "high",
        requirements: ["high"],
        states: [{ name: "high/red", isDone: ["highred"] }],
      },
      { name: "up/red", isDone: ["red"] },
      { name: "up/green", isDone: ["green"] },
      { name: "up/blue", isDone: ["blue"] },
    ],
  },
  {
    fork: "vertical",
    requirements: ["down"],
    states: [
      { name: "down/red", isDone: ["red"] },
      { name: "down/green", isDone: ["green"] },
      { name: "down/blue", isDone: ["blue"] },
    ],
  },
];

const simpleConditions: Record<string, Condition<any>> = {
  first: () => true,
  second: () => true,
  third: () => true,
  left: () => true,
  right: () => true,
  middle: () => true,
  red: () => true,
  green: () => true,
  blue: () => true,
  yes: () => true,
  no: () => true,
  up: () => true,
  down: () => true,
  high: () => true,
  highred: () => true,
};

const accumulateStates = (states: State<any, any>[]): State<any, any>[] =>
  states.reduce((acc, state) => {
    if (isFork(state)) {
      return [...acc, ...accumulateStates(state.states)];
    }
    return [...acc, state];
  }, [] as State<any, any>[]);

enum REASONS {
  ENTRY_NOT_DONE = "ENTRY_NOT_DONE",
  ENTRY_DONE = "ENTRY_DONE",
  FORK_ENTERED = "FORK_ENTERED",
  FORK_SKIPPED = "FORK_SKIPPED",
  ENTRY_TO_FORK = "ENTRY_TO_FORK",
}

const process = (
  states: State<any, any>[],
  conditions: Record<string, Condition<any>>
) => {
  const execute = makeMachine(states, conditions);
  // const conditionsExplosion = objectBooleanCombinations(conditions);
  // console.log(conditionsExplosion);
  // const allStates = accumulateStates(states);
  const result: any = [];

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
            ...getHistoryLinks(
              enteredFork.history,
              enteredFork.entry,
              false,
              truthyCtx
            )
          );
          run(state.states, truthyCtx);
        }

        if (skippedFork) {
          result.push(
            ...getHistoryLinks(
              skippedFork.history,
              skippedFork.entry,
              true,
              falsyCtx
            )
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
          result.push({
            from: state,
            to: next.entry,
            reason: REASONS.ENTRY_DONE,
          });
        }
      }
    });
  };

  run(
    states,
    Object.entries(conditions).reduce(
      (acc, [name]) => ({ ...acc, [name]: false }),
      {}
    )
  );

  const lines = result.reduce((prev: any, link: any) => {
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

  console.log(
    result.map((line: any) => ({
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

const getHistoryLinks = (
  history: HistoryState<any, any>[],
  entry: Entry<any, any>,
  skipped: boolean,
  ctx: any
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

    if (!nextHistoryState) {
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

  console.log([...history, entry], { skipped, ctx });

  return result;
};

const makeId = (state: State<any, any> | undefined) =>
  !state
    ? "undefined"
    : isFork(state)
    ? state.fork.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
    : state.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

const toName = (state: State<any, any> | undefined) =>
  !state ? "undefined" : isFork(state) ? state.fork : state.name;

// const rendered = process(beerStates, beerConditions);
const rendered = process(simpleStates, simpleConditions);

const App = () => {
  console.log(rendered.split("\n"));
  return <Mermaid chart={rendered} />;
};

const elm = document.createElement("div");
document.body.appendChild(elm);
ReactDOM.render(<App />, elm);
