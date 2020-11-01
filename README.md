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

Entry states can be declared using Entries and decisions in the direction of the flow can be declared using Forks.

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
));

console.log(execute({
  name: undefined,
  age: undefined,
}));
// --> What's your name

console.log(execute({
  name: "Joseph Luck",
  age: undefined,
}));
// --> { entry: { name: "What's your age", ... }, history: [ ... ] }

console.log(execute({
  name: "Joseph Luck",
  age: 14,
}));
// --> { entry: { name: "Sorry, you're too young for free beer", ... }, history: [ ... ] }

console.log(execute({
  name: "Joseph Luck",
  age: 36,
}));
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
console.log(
  execute({
    name: "Joseph Luck",
    age: 36,
  })
);
// {
//   entry: { name: "Great, you can have free beer!" },
//   history: [
//     { name: "What's your name" },
//     { name: "What's your age" },
//     { fork: "Old enough to drink?" },
//   ]
// }
```

#### Replaying history

In certain scenarios (for example a navigation flow where the user can navigate backwards), it's useful to find the next state in history rather than the end state. For example, imagine that in the machine above the user has filled out all of the information and has reached the end of the machine. Now, the user has navigated back to the first screen and has updated their name. Now they expect to be taken to the age screen again, essentially travelling forwards through the screens they just went back through in the same order. Of course, if the user updates information that changes the direction through the states (aka different forks) then those paths are respected. Here's an example:

```typescript
console.log(
  execute(
    {
      name: "Joseph Luck",
      age: 36,
    },
    "What's your name"
  )
);
// {
//   entry: { name: "What's your age" },
//   history: [
//     { name: "What's your name" },
//     { name: "What's your age" },
//     { fork: "Old enough to drink?" },
//   ]
// }
```

In this example, although the age entry's `isDone` is satisfied, it's returned as the execute return as it's the entry following to the name entry in the history.

You'll notice that the history retains all states regardless of the returned entry.

### Conditions

The second argument to Machi is an object of condition functions that are referred to by Entries and Forks as strings (these are type safe if you're using TypeScript!). Condition functions are predicates that are provided the current data context for the machine and are expected to return a boolean.

### Extra data

Entries can specify any additional data. For example:

```typescript
type Context = {
  name: string | undefined;
  age: number | undefined;
};

type AdditionalEntryData = {
  screen: () => React.ReactNode;
};

const execute = makeMachine<Context, AdditionalEntryData>(
  [
    {
      name: "What's your name",
      isDone: ["hasProvidedName"],
      screen: NameScreen,
    },
    {
      name: "And your age?",
      isDone: ["hasProvidedAge"],
      screen: AgeScreen,
    },
    {
      fork: "Old enough to drink?",
      requirements: ["isOfLegalDrinkingAge"],
      states: [
        {
          name: "Great, you can have free beer!",
          isDone: [],
          screen: FreeBeerScreen,
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
          screen: TooYoungScreen,
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
));
```

If you're using TypeScript, you can provide type safety to your entries additional properties by using the second generic of `makeMachine`.

## Graphical representations of a machine

As a machine grows, it can become difficult to follow the flow of states. Machi comes with a utility for generating a graphical representation of a machine using Mermaid.

```typescript
const graph = generateMermaid(states);
```
