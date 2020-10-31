<div align="center">
  <h1>
    <br/>
    <br/>
    🔌
    <br />
    <br />
    Machi
    <br />
    <br />
    <br />
    <br />
  </h1>
  <br />
  <p>
    Data driven state machines.
  </p>
  <br />
  <br />
  <br />
  <br />
</div>

[![npm version](https://img.shields.io/npm/v/@josephluck/machi.svg?style=flat)](https://www.npmjs.com/package/@josephluck/machi) [![CircleCI Status](https://circleci.com/gh/josephluck/machi.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/josephluck/machi)

## Installation

```
yarn add @josephluck/machi
```

Or...

```
npm i @josephluck/machi --save
```

## Usage

Machi provides a deterministic state machine driven by data. Once a machine is constructed by passing in a list of states (see below for details), it can be passed data to determine the next state.

When a Machi machine is provided with data, it will iterate through all of the states and determine the first entry where the data does not satisfy it's constraints.

Terminal states can be declared by using Entries and decisions in the direction of the flow can be created by using Forks.

### Example:

```typescript
type Context = {
  name: string | undefined;
  age: number | undefined;
};

const execute = makeMachine<Context>(
  [
    {
      name: "What's your name",
      isDone: ["hasProvidedName"],
    },
    {
      name: "And your age?",
      isDone: ["hasProvidedAge"],
    },
    {
      fork: "Old enough to drink?",
      requirements: ["isOfLegalDrinkingAge"],
      states: [
        {
          name: "Great, you can have free beer!",
          isDone: [],
        },
      ],
    },
    {
      fork: "Old enough to drink?",
      requirements: ["isTooYoung"],
      states: [
        {
          name: "Sorry, you're too young for free beer",
          isDone: [],
        },
      ],
    },
  ],
  {
    hasProvidedName: (context) => !!context.name,
    hasProvidedAge: (context) => !!context.age,
    isOfLegalDrinkingAge: (context) => context.age >= 18,
    isTooYoung: (context) => context.age < 18,
  }
);

execute({
  name: undefined,
  age: undefined,
});
// --> What's your name

execute({
  name: "Joseph Luck",
  age: undefined,
});
// --> { entry: { name: "What's your age", ... }, history: [ ... ] }

execute({
  name: "Joseph Luck",
  age: 14,
});
// --> { entry: { name: "Sorry, you're too young for free beer", ... }, history: [ ... ] }

execute({
  name: "Joseph Luck",
  age: 36,
});
// --> { entry: { name: "Great, you can have free beer!", ... }, history: [ ... ] }
```

This simple machine results in the flow:

![simple flow](https://github.com/josephluck/machi/blob/master/screenshots/simple-machine.png?raw=true)

### Executing

When executing a machine, Machi will traverse the list of states and evaluate them in order.

When a Fork is evaluated, it's `requirements` conditions will be checked, and if they are all truthy, the Fork's `states` will be evaluated recursively.

When an Entry is evaluates, it's `isDone` conditions will be checked, and if any of them return false, the machine will terminate and the Entry will be returned.

Machi will accumulate the history of Entries and entered Forks that resulted in the terminal state. For example:

```typescript
execute({
  name: "Joseph Luck",
  age: 36,
});
// {
//   entry: { name: "Great, you can have free beer!" },
//   history: [
//     { name: "What's your name" },
//     { name: "What's your age" },
//     { fork: "Old enough to drink?" },
//   ]
// }
```

### Conditions

The second argument to Machi is an object of condition functions that are referred to by Entries Forks as strings (these are type safe if you're using TypeScript!). Condition functions are predicates that are provided the current data context for the machine and are expected to return a boolean.

## Graphical representations of a machine

As a machine grows, it can become difficult to follow the flow of the machine. Machi comes with graph generation utilities using Mermaid.

TODO...
