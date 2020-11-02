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

Machi lets you build deterministic state machine driven by data. A Machi machine consists of a list of states and data to determine the next state.

When a Machi machine is "executed" (aka provided with data), it will iterate through all of the states and determine the first Entry that is not considered "done".

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

This simple machine results in the following flow:

![simple flow](https://github.com/josephluck/machi/blob/master/screenshots/simple-machine.png?raw=true)

### Executing

Once constructed, a Machi machine is one simple function called `execute`. The execute function will is used to traverse the list of states, evaluating each state in order.

When a Fork is evaluated, it's `requirements` conditions will be checked, and if they are all truthy, the Fork's `states` will be evaluated recursively.

When an Entry is evaluates, it's `isDone` conditions will be checked, and if any of them return false, the machine will terminate and the Entry will be returned.

### History

Machi will accumulate the history of Entries and entered Forks that resulted in the final state. For example:

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

In certain scenarios (for example in a navigation flow where the user can navigate backwards through previous states), it's useful to find the next Entry in the history rather than the final Entry.

Take the machine above for example, imagine that the user has filled out all of the information and has reached the end of the machine. Now, the user has navigated back to the first screen and has updated their name. Now they expect to be taken to the age screen again, essentially travelling forwards through the screens they just went back through in the same order.

Of course, if the user updates information that changes the direction through the states (aka different forks) then the result will not follow the previous history. Here's an example:

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

In this example, although the age entry's `isDone` is satisfied it is returned as it's the entry to the name entry (which has been passed in as the current state during execution) in the history.

You'll notice that the history includes all satisfied Entries and Forks regardless of whether it's traversing through history or not.

### Conditions

The second argument to Machi is an object of condition functions that are referred to by Entries and Forks using keys (these are type safe if you're using TypeScript!). Condition functions are predicates that are provided the current data context (passed in during execution) and are expected to return a boolean.

### Extra Entry data

By default Entries are expected to provide a `name` and a list of `isDone` conditions, however to provide extra utility Entries can specify arbitrary additional data. For example:

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

If you're using TypeScript, you can provide type safety to your entries additional properties by populating the second generic of `makeMachine`.

## Graphical representations of a machine

As a machine grows in size and complexity, it can become difficult to follow the flow of states using code alone. As Machi is a deterministic state machine, it's possible to generate a graphical representation of the flow. Machi comes with a tool to generate such a flow chart that you can run from your command line.

The tool expects you to provide a JavaScript file (when using node) or a TypeScript file (when using ts-node) with a default export containing your list Machi states. For example:

```typescript
// path/to/my/states.ts
const states = [
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
  ...otherStates,
];

export default states;
```

Using node:

```bash
node ./node_modules/@josephluck/machi/chart.js --states ./path/to/my/states.js --output ./path/to/my/output.svg
```

Using TypeScript

```bash
yarn add ts-node

ts-node ./node_modules/@josephluck/machi/chart.js --states ./path/to/my/states.ts --output ./path/to/my/output.svg
```

- `--states` is the path relative to your current working directory (where you ran the chart tool from) to your file containing a default export of your states.
- `--output` is the path relative to your current working directory (where you ran the chart tool from) to where you wish to output the generated flow chart.
- `--direction` can either be "horizontal" or "vertical" (defaults to vertical) which is used to control the direction of the generated flow chart.
