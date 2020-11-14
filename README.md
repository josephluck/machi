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

## What?

Machi lets you build deterministic state machines driven by data. A Machi machine consists of a list of states and data to determine the next state.

## Why?

Machi is useful to power data-driven flows through a UI where different screens or components are shown depending on information in the machine.

For example, your app might have a complex onboarding journey whereby the user enters information through a series of screens, and the screens they see is dependent on the information they provide as they progress through the journey.

Depending on the complexity of the journey and the different variations in the direction of the journey, it can be very difficult to manage transitions imperatively. Machi lets you manage a flow declaratively with conditions that determine the direction based on data.

By declaring states this way, it's possible to evaluate all possible paths through the flow depending on the specified conditions for each state as well as being able to _restore_ a flow from the ground-up. This has some great benefits:

- As Machi is _deterministic_, a history of the traversed states is built up when a machine is executed. This means it's possible to persist the data and _restore_ the flow from the ground-up at any time. By consequence, it's trivial to support scenarios such as the user quitting the app before they have finished the flow and being able to carry on from where they left off whilst maintaining the history of which states they have been through already. This is particularly useful when restoring a back stack.
- If the data passed to the machine is persisted, it's possible to release updates to the machine (say for example, a new app release) with the machine taking care of the correct state to present to the user when they _restore_ the flow.
- Machi is able to generate a visual representation of a machine as a flow chart. This helps developers, designers and other stakeholders understand the complexity and possible paths through a machine. It also helps visualise _changes_ to the flow as you extend and modify a machine by giving you confidence that you're not accidentally breaking the flow.
- Similarly, since Machi encodes all possible paths through a machine, it's possible to generate tests from the machine which can provide a belts-and-braces testing strategy when combined with traditional unit, integration and end-to-end tests.

## Installation

```
yarn add @josephluck/machi
```

Or...

```
npm i @josephluck/machi --save
```

## Concepts

Machi has the following core concepts:

**Machine**

A machine is a list of states that are comprised of Entries and Forks. It can be Executed with Context to determine the next Entry.

**State**

A State is a a single node in the machine. It's either an Entry or a Fork.

**Entry**

An Entry is a state in the machine that the machine can resolve when it's Executed. It has a name and a list of predicate conditions that determine whether the Entry is "done". When the machine is Executed and it encounters an Entry it will evaluate it's conditions and if they are all truthy, the machine will add it to the History and evaluate the next State in the machine.

Aside from an Entries name and done conditions, an Entry can contain any additional data.

**Fork**

A Fork is a state in the machine that can be used to separate a series of States based on conditions. It has a name, a list of States and a list of predicate conditions that determine whether the Fork's states will be evaluated. When the machine is Executed and it encounters a Fork it will evaluate it's entry conditions and if they are all truthy, the machine will add it to the History and evaluate the Fork's list of States.

**Conditions and Context**

A condition is a predicate function that can be used as an Entries "done" requirements or Fork's entry requirements.

Context is passed to a machine when it is Executed. The Context for the machine can be any data type (string, boolean, object, number etc) and will be passed to Condition predicate functions when the machine is Executed. It's important that Condition functions _do not modify the Context in any way_ (this keeps the machine deterministic during execution).

**Execute and History**

A machine can be executed to determine the next Entry. If there are no Entries in the machine that are _not_ done, execute will return a null for the next State. Execute will also return the history of done Entries and entered Forks in the order in which they were evaluated.

It is possible to re-evaluate History with new Context by passing Execute the name of the Entry in History. When Executing like this, the machine will return the immediate next Entry from the History providing the passed Entry exists in the new history. See below for a concrete example.

## Usage

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
