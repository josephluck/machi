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
    fork: "direction",
    requirements: ["left"],
    states: [
      { name: "left/red", isDone: ["red"] },
      { name: "left/green", isDone: ["green"] },
      { name: "left/blue", isDone: ["blue"] },
    ],
  },
  {
    fork: "direction",
    requirements: ["right"],
    states: [
      { name: "right/red", isDone: ["red"] },
      { name: "right/green", isDone: ["green"] },
      { name: "right/blue", isDone: ["blue"] },
    ],
  },
  {
    fork: "middle",
    requirements: ["middle"],
    states: [
      {
        fork: "yes",
        requirements: ["yes"],
        states: [{ name: "yes/end", isDone: ["no"] }],
      },
      { name: "yes/red", isDone: ["red"] },
      { name: "yes/green", isDone: ["green"] },
      { name: "yes/blue", isDone: ["blue"] },
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
  FORK_TO_FORK = "FORK_ENTERED",
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

  const run = (
    _states: State<any, any>[],
    levelCtx: any,
    prevFork?: Fork<any, any>
  ) => {
    let prevEntry: Entry<any, any> | undefined;

    _states.forEach((state) => {
      if (isFork(state)) {
        if (prevFork) {
          result.push({
            from: prevFork,
            to: state,
            reason: REASONS.FORK_TO_FORK,
          });
        }

        if (prevEntry && isEntry(prevEntry)) {
          result.push({
            from: prevEntry,
            to: state,
            reason: REASONS.ENTRY_TO_FORK,
          });
        }
        const truthyCtx = { ...levelCtx };
        const falsyCtx = { ...levelCtx };
        state.requirements.forEach((cond) => {
          truthyCtx[cond] = true;
          falsyCtx[cond] = false;
        });
        const enteredFork = execute({}, undefined, states, [], truthyCtx);
        const skippedFork = execute({}, undefined, states, [], falsyCtx);

        if (enteredFork) {
          result.push({
            from: state,
            to: enteredFork.entry,
            reason: REASONS.FORK_ENTERED,
          });
          run(state.states, truthyCtx, state);
        }

        if (skippedFork) {
          result.push({
            from: state,
            to: skippedFork.entry,
            reason: REASONS.FORK_SKIPPED,
          });
          run(state.states, falsyCtx, state);
        }
      }

      if (isEntry(state)) {
        state.isDone.forEach((cond) => {
          levelCtx[cond] = true;
        });
        const next = execute({}, undefined, states, [], levelCtx);

        if (!next) {
          // result.push({
          //   from: state,
          //   to: state,
          //   reason: REASONS.ENTRY_NOT_DONE,
          // });
        } else {
          result.push({
            from: state,
            to: next.entry,
            reason: REASONS.ENTRY_DONE,
          });
        }
        prevEntry = state;
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
      const reqs = `|${link.from.requirements.join(" and ")} ${isAre} true|`;
      if (isEntry(link.to) && link.reason === REASONS.FORK_ENTERED) {
        const line = `${fromId} --> ${reqs} ${toId}[${link.to.name}]`;
        return [...prev, line];
      }
      if (isFork(link.to) && link.reason === REASONS.FORK_TO_FORK) {
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
        const reqs = `|${link.from.isDone.join(" and ")} ${isAre} true|`;
        const line = `${fromId}[${link.from.name}] --> ${reqs} ${toId}[${link.to.name}]`;
        return [...prev, line];
      }
      if (isFork(link.to)) {
        const reqs = `|${link.from.isDone.join(" and ")} ${isAre} true|`;
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

type ProcessResult = {
  previousState: State<any, any> | undefined;
  result: string;
};

const _process = (
  _states: State<any, any>[],
  _conditions: Record<string, Condition<any>>,
  _previousState: State<any, any> | undefined = undefined,
  _previousResult: string = ""
): ProcessResult => {
  const execute = makeMachine(_states, _conditions);

  const makeConditionsResult = (result: boolean) =>
    Object.entries(_conditions).reduce(
      (acc, [name]) => ({ ...acc, [name]: result }),
      {} as Record<string, boolean>
    );

  const allTruthyConditions = makeConditionsResult(true);
  const allFalsyConditions = makeConditionsResult(false);

  const processed = _states.reduce(
    (acc, state) => {
      if (isFork(state)) {
        const next = execute(
          {},
          undefined,
          state.states,
          [],
          allFalsyConditions
        );

        const missing = execute({}, undefined, state.states, [], {
          ...allFalsyConditions,
          ...state.requirements.reduce(
            (acc, name) => ({ ...acc, [name]: true }),
            {}
          ),
        });

        console.log(
          "Running fork",
          acc.previousState,
          state.fork,
          missing?.entry.name
        );

        const r = state.requirements.join(" and ");
        const s = state.requirements.length > 1 ? "are" : "is";

        const forkMermaid = `${makeId(state)}{${state.fork}}`;

        const nextMermaid = next
          ? `${makeId(state)} --> |${r} ${s} FOO| ${makeId(next.entry)}[${
              next.entry.name
            }]`
          : undefined;

        const subStates = _process(state.states, _conditions, state);

        // console.log("Evaluating fork ", { state, subStates });

        const prevId = makeId(acc.previousState);
        const links = [forkMermaid, nextMermaid];
        const result =
          `${prevId} --> ${links.filter(Boolean).join("\n")}\n` +
          subStates.result;

        return {
          previousState: state,
          result: acc.result.length ? `${acc.result}\n${result}` : result,
        };
      }

      if (isEntry(state)) {
        if (!acc.previousState) {
          console.log("On first entry", state.name);
          return {
            previousState: state,
            result: "",
          };
        }

        if (isFork(acc.previousState)) {
          console.log("On entry linked to fork", acc.previousState, state);
          const r = acc.previousState.requirements.join(" and ");
          const s = acc.previousState.requirements.length > 1 ? "are" : "is";

          const forkMermaid = `${makeId(acc.previousState)}{${
            acc.previousState.fork
          }}`;

          const nextMermaid = state
            ? `${makeId(acc.previousState)} --> |${r} ${s} BAR| ${makeId(
                state
              )}[${state.name}]`
            : undefined;

          const prevId = makeId(acc.previousState);
          const links = [forkMermaid, nextMermaid];
          const result = `${prevId} --> ${links.filter(Boolean).join("\n")}`;

          return {
            previousState: state,
            result: acc.result ? `${acc.result}\n${result}` : result,
          };
        }

        if (isEntry(acc.previousState)) {
          console.log(
            "On entry linked to entry",
            acc.previousState.name,
            state.name
          );
          const r = acc.previousState.isDone.join(" and ");
          const s = acc.previousState.isDone.length > 1 ? "are" : "is";

          const prevId = makeId(acc.previousState);
          const prevName = isFork(acc.previousState!)
            ? acc.previousState.fork
            : isEntry(acc.previousState!)
            ? acc.previousState.name
            : "undefined";

          const previousLink = `${prevId}[${prevName}] -->`;
          const nextDestination = `${makeId(state)}(${state.name})`;
          const selfDestination = `${prevId}(${prevName})`;

          const nextMermaid = `${previousLink} |${r} ${s} done| ${nextDestination}`;
          const toSelfMermaid = `${previousLink} |${r} ${s} not done| ${selfDestination}`;

          return {
            previousState: state,
            result: acc.result.length
              ? `${acc.result}\n${nextMermaid}\n${toSelfMermaid}`
              : `${nextMermaid}\n${toSelfMermaid}`,
          };
        }

        return acc;
      }

      return acc;
    },
    { previousState: _previousState, result: _previousResult } as ProcessResult
  );

  return processed;
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
