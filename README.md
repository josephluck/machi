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

Machi is useful to power data-driven flows where different states are resolved depending on information in the machine. As an example, a machine can encode a navigation flow through a journey where states can represent screens or components.

For example, your app might have a complex onboarding journey whereby the user enters information through a series of screens, and the direction through the journey is dependent on the information they provide.

Depending on the complexity of the journey and the different variations in the direction of the journey, it can be very difficult to manage transitions imperatively. Machi lets you manage a flow declaratively with conditions that determine the direction based on data passed in to the machine.

By declaring states this way, it's possible to evaluate all possible paths through the flow depending on the specified conditions for each state as well as being able to _restore_ a flow from the ground-up. This has some great benefits:

- Machi accumulates the history of the traversed states when it is executed with data. This makes it possible to _restore_ the flow from the ground-up at any time. Therefore it's trivial to support scenarios such as the user quitting the app before they have finished the flow and being able to resume from where they left off whilst maintaining the history of which states they have been through already.
- If the data passed to the machine is persisted (aka to a database), it's possible to release updates to the machine (say for example, a new app release) with the machine taking care of the correct state to present to the user when they _restore_ the flow.
- Machi ships with a tool that generates a visual representation of a machine as a flow chart. This helps developers, designers and other stakeholders understand the complexity and possible paths through a machine. It also helps visualise _changes_ to the flow as you extend and modify a machine and gives you confidence that you're not accidentally breaking the flow somewhere.
- Similarly, since Machi encodes all possible paths through a machine it's possible to generate tests from the machine which can provide a belts-and-braces testing strategy when combined with traditional unit, integration and end-to-end tests.

## Installation

```
yarn add @josephluck/machi
```

Or...

```
npm i @josephluck/machi --save
```

## Usage

When a Machi machine is "executed", it will iterate through all of the states and determine the first Entry that is not considered "done".

Entry states can be declared using Entries and decisions in the direction of the flow can be declared using Forks.

### Example projects:

- [React Native app onboarding flow](./examples/app-onboarding)
- More to come 😊

### Simple example:

```typescript
type Context = {
  name: string | undefined;
  age: number | undefined;
};

const execute = makeMachine<Context>(
  [
    {
      id: "What's your name",
      isDone: ["hasProvidedName"],
    },
    {
      id: "And your age?",
      isDone: ["hasProvidedAge"],
    },
    {
      fork: "Old enough to drink?",
      requirements: ["isOfLegalDrinkingAge"],
      states: [
        {
          id: "Great, you can have free beer!",
          isDone: [],
        },
      ],
    },
    {
      id: "Sorry, you're too young for free beer",
      isDone: [],
    },
  ],
  {
    hasProvidedName: (context) => !!context.name,
    hasProvidedAge: (context) => !!context.age,
    isOfLegalDrinkingAge: (context) => context.age >= 18,
  }
);

console.log(
  execute({
    name: undefined,
    age: undefined,
  })
);
// --> { entry: { id: "What's your name", ... }, history: [ ... ] }

console.log(
  execute({
    name: "Joseph Luck",
    age: undefined,
  })
);
// --> { entry: { id: "What's your age", ... }, history: [ ... ] }

console.log(
  execute({
    name: "Joseph Luck",
    age: 14,
  })
);
// --> { entry: { id: "Sorry, you're too young for free beer", ... }, history: [ ... ] }

console.log(
  execute({
    name: "Joseph Luck",
    age: 36,
  })
);
// --> { entry: { id: "Great, you can have free beer!", ... }, history: [ ... ] }
```

This simple machine results in the following flow:

![simple flow](https://github.com/josephluck/machi/blob/master/screenshots/simple-machine.png?raw=true)

> Note that this graphic was created from the machine above using Machi's flow chart generation utility. See below for details on how to generate charts for your own machines.

## Concepts

Machi has the following core concepts:

**Machine**

A machine is a list of states that are comprised of Entries and Forks. It can be Executed with Context to determine the next Entry.

**State**

A State is a single node in the machine. It's either an Entry or a Fork.

**Entry**

An Entry is a state in the machine that the machine can resolve when it's Executed. It has a id and a list of predicate conditions that determine whether the Entry is "done". When the machine is Executed and it encounters an Entry it will evaluate it's conditions and if they are all truthy, the machine will add it to the History and evaluate the next State in the machine.

Aside from an Entries id and done conditions, an Entry can contain any additional data and this data will be returned when the machine is executed.

**Fork**

A Fork is a state in the machine that can be used to separate a series of States based on conditions. It has a name (fork), a list of States and a list of predicate conditions that determine whether the Fork's states will be evaluated during execution. When the machine is Executed and it encounters a Fork it will evaluate it's entry conditions and if they are all truthy, the machine will add it to the History and evaluate the Fork's list of States recursively.

**Conditions and Context**

A condition is a predicate function that can be used as an Entries "done" requirements or Fork's entry requirements.

Context is passed to a machine when it is Executed. The Context for the machine can be any data type (string, boolean, object, number etc) and will be passed to Condition predicate functions when the machine is Executed. It's important that Condition functions _do not modify the Context in any way_ (this keeps the machine deterministic during execution).

**Execute and History**

A machine can be executed to determine the next Entry. If there are no Entries in the machine that are _not_ done, execute will return a null for the next State. Execute will also return the history of done Entries and entered Forks in the order in which they were evaluated.

It is possible to re-evaluate History with new Context by passing Execute the id of the Entry in History. When a machine is executed with an entry id, if the entry id is found in the history of the execution result, the entry immediately following the passed entry id will be returned, rather than the last entry in the execute result. See below for a concrete example.

### Executing

Once constructed, a Machi machine is just one simple function referred to in this documentation as `execute`. The execute function is used to traverse the list of states, evaluating each state in order and recursively.

When a Fork is evaluated, it's `requirements` conditions will be checked and if they are all truthy, the Fork's `states` will be evaluated recursively.

When an Entry is evaluated, it's `isDone` conditions will be checked and if any of them return false, the machine will terminate and the Entry will be returned.

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
//   entry: { id: "Great, you can have free beer!" },
//   history: [
//     { id: "What's your id" },
//     { id: "What's your age" },
//     { fork: "Old enough to drink?" },
//   ]
// }
```

#### Replaying history

In certain scenarios (for example in a navigation flow where the user can navigate backwards through previous states), it's useful to find the next Entry in the history rather than the final Entry.

Take the machine above for example, imagine that the user has filled out all of the information and has reached the end of the machine. Now, the user has navigated back to the first screen and has updated their name. They expect to be taken to the age screen again (essentially travelling forwards through the screens they just went back through in the same order).

However, if the user updates information that changes the direction through the states then the result will not follow the previous history. Here's an example:

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
//   entry: { id: "What's your age" },
//   history: [
//     { id: "What's your name" },
//     { id: "What's your age" },
//     { fork: "Old enough to drink?" },
//   ]
// }
```

In this example, although the age entry's `isDone` is satisfied it is returned as it's the entry next to the name entry (which has been passed in as the current state during execution) in the history.

You'll notice that the history includes all satisfied Entries and Forks regardless of whether it's traversing through history or not.

### Conditions

The second argument to Machi is an object of condition functions that are referred to by Entries and Forks using keys (these are type safe if you're using TypeScript!). Condition functions are predicates that are provided the current data context (passed in during execution) and are expected to return a boolean.

Machi also supports in-line condition predicates against entries and forks which can be useful for conditions that are not shared between states:

```typescript
type Context = {
  name: string | undefined;
  age: number | undefined;
};

const execute = makeMachine<Context>(
  [
    {
      id: "What's your name",
      isDone: ["hasProvidedName"], // This is run when execute is called, and cached if this condition is encountered later in execution
    },
    {
      id: "And your age?",
      isDone: [(context) => !!context.age], // This is called when the machine evaluates this state
    },
  ],
  {
    hasProvidedName: (context) => !!context.name,
  }
);
```

It's recommended to use condition objects referred to by key, as Machi will evaluate these once at the start of execution and caches them during recursive evaluation, which is better for performance. In addition, during chart generation (see below), conditions referred to by key will provide useful labels shown against state connections (if you use a named inline function, you'll also get a useful label - if you use an anonymous function, it'll display "unknown").

### Extra Entry data

By default Entries are expected to provide a `id` and a list of `isDone` conditions, however to provide extra utility Entries can specify arbitrary additional data. For example:

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
      id: "What's your name",
      isDone: ["hasProvidedName"],
      screen: NameScreen,
    },
    {
      id: "And your age?",
      isDone: ["hasProvidedAge"],
      screen: AgeScreen,
    },
    {
      fork: "Old enough to drink?",
      requirements: ["isOfLegalDrinkingAge"],
      states: [
        {
          id: "Great, you can have free beer!",
          isDone: [],
          screen: FreeBeerScreen,
        },
      ],
    },
    {
      id: "Sorry, you're too young for free beer",
      isDone: [],
      screen: TooYoungScreen,
    },
  ],
  {
    hasProvidedName: (context) => !!context.name,
    hasProvidedAge: (context) => !!context.age,
    isOfLegalDrinkingAge: (context) => context.age >= 18,
  }
);
```

If you're using TypeScript, you can provide type safety to your entries additional properties by populating the second generic of `makeMachine`.

## Graphical representations of a machine

As a machine grows in size and complexity, it can become difficult to follow the flow of states using code alone. As Machi is a deterministic state machine, it's possible to generate a graphical representation of the flow. Machi comes with a tool to generate such a flow chart that you can run from your command line.

The tool expects you to provide a JavaScript file (when using node) or a TypeScript file (when using ts-node) with a default export containing your list Machi states. For example:

```typescript
// path/to/my/states.ts
const states = [
  {
    id: "What's your name",
    isDone: [
      "hasProvidedName",
      function anotherNamedCondition() {
        return true;
      },
    ],
    screen: NameScreen,
  },
  {
    id: "And your age?",
    isDone: ["hasProvidedAge"],
    screen: AgeScreen,
  },
  ...otherStates,
];

export default states;
```

In order to run the generation, you must have `ts-node` installed globally on your machine:

```bash
yarn global add ts-node
```

```bash
yarn install -g ts-node
```

Then, you're able to run the generation

```bash
ts-node ./node_modules/@josephluck/machi/src/graph/generate-chart.ts --states ./path/to/my/states.ts --output ./path/to/my/output.svg
```

For all the options, run the help script:

```bash
ts-node ./node_modules/@josephluck/machi/src/graph/generate-chart.ts --help
```
