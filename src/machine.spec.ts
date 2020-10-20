import { makeMachine, Entry } from "./machine";

describe("state machine", () => {
  it("initialises a simple machine", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          isDone: ["no"],
        },
      ],
      void null,
      basicConditions
    );

    expect(machine.initial!.entry.name).toEqual("1");
    expect(machine.initial!.history.map(toName)).toEqual([]);
  });

  it("initialises a simple machine with multiple conditions", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          isDone: ["yes", "overrideWithNo"],
        },
      ],
      void null,
      { ...basicConditions, overrideWithNo: () => false }
    );

    expect(machine.initial!.entry.name).toEqual("1");
    expect(machine.initial!.history.map(toName)).toEqual([]);
  });

  it("builds up history from a simple machine", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          isDone: ["yes"],
        },
        {
          name: "2",
          isDone: ["yes"],
        },
        {
          name: "3",
          isDone: ["yes"],
        },
        {
          name: "4",
          isDone: ["no"],
        },
      ],
      void null,
      basicConditions
    );
    expect(machine.initial!.entry.name).toEqual("4");
    expect(machine.initial!.history.map(toName)).toEqual(["1", "2", "3"]);
  });

  it("initialises to a deep state based on context", () => {
    const machine = makeMachine(
      [
        {
          fork: "Is Yes",
          requirements: ["yes"],
          states: [
            {
              name: "1",
              isDone: ["yes"],
            },
            {
              name: "2",
              isDone: ["yes"],
            },
            {
              fork: "Is No",
              requirements: ["no"],
              states: [{ name: "3", isDone: ["no"] }], // won't get here as the fork's condition prevents it
            },
            {
              fork: "Is Yes",
              requirements: ["yes"],
              states: [
                { name: "4", isDone: ["no"] }, // terminates here as it's the first evaluated entry that is not yet done
                { name: "5", isDone: ["no"] },
                { name: "6", isDone: ["no"] },
              ],
            },
            {
              name: "7",
              isDone: ["yes"], // won't get here as the terminal state should already be found
            },
          ],
        },
      ],
      void null,
      basicConditions
    );

    expect(machine.initial!.entry.name).toEqual("4");
    expect(machine.initial!.history.map(toName)).toEqual(["1", "2"]);
  });

  it("skips over a fork if all it's entries are done", () => {
    const machine = makeMachine(
      [
        {
          fork: "Is Yes",
          requirements: ["yes"],
          states: [
            {
              name: "1",
              isDone: ["yes"],
            },
            {
              name: "2",
              isDone: ["yes"],
            },
            {
              fork: "Is Yes",
              requirements: ["yes"],
              states: [
                { name: "3", isDone: ["yes"] },
                { name: "4", isDone: ["yes"] },
                { name: "5", isDone: ["yes"] },
              ],
            },
            {
              name: "6",
              isDone: ["no"],
            },
          ],
        },
      ],
      void null,
      basicConditions
    );

    expect(machine.initial!.entry.name).toEqual("6");
    expect(machine.initial!.history.map(toName)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("enters the correct fork if there are multiple competing forks", () => {
    const machine = makeMachine(
      [
        {
          fork: "Is No",
          requirements: ["no"],
          states: [
            {
              name: "1",
              isDone: ["no"],
            },
          ],
        },
        {
          fork: "Is Yes",
          requirements: ["yes"],
          states: [
            {
              name: "2",
              isDone: ["yes"],
            },
            {
              name: "3",
              isDone: ["yes"],
            },
            {
              fork: "Is Yes",
              requirements: ["yes"],
              states: [
                { name: "4", isDone: ["yes"] },
                { name: "5", isDone: ["yes"] },
                { name: "6", isDone: ["yes"] },
              ],
            },
            {
              name: "7",
              isDone: ["no"],
            },
          ],
        },
        {
          fork: "Is No Again",
          requirements: ["no"],
          states: [
            {
              name: "8",
              isDone: ["no"],
            },
          ],
        },
      ],
      void null,
      basicConditions
    );

    expect(machine.initial!.entry.name).toEqual("7");
    expect(machine.initial!.history.map(toName)).toEqual([
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
  });

  it("correctly determines next state and history when machine context is updated", () => {
    const machine = makeMachine(
      [
        {
          fork: "Is Yes",
          requirements: ["yes"],
          states: [
            { name: "1", isDone: ["yes"] },
            { name: "2", isDone: ["maybe"] },
            { name: "3", isDone: ["no"] },
          ],
        },
        { name: "4", isDone: ["no"] },
      ],
      false,
      { ...basicConditions, maybe: (isYes) => isYes }
    );
    expect(machine.initial!.entry.name).toEqual("2");
    expect(machine.initial!.history.map(toName)).toEqual(["1"]);

    const next = machine.execute(true);
    expect(next!.entry.name).toEqual("3");
    expect(next!.history.map(toName)).toEqual(["1", "2"]);
  });

  it("correctly goes back to previous state when the machines context is updated", () => {
    const machine = makeMachine(
      [
        {
          fork: "Is Yes",
          requirements: ["yes"],
          states: [
            { name: "1", isDone: ["yes"] },
            { name: "2", isDone: ["maybe"] },
            { name: "3", isDone: ["no"] },
          ],
        },
        { name: "4", isDone: ["no"] },
      ],
      true,
      { ...basicConditions, maybe: (isYes) => isYes }
    );
    expect(machine.initial!.entry.name).toEqual("3");
    expect(machine.initial!.history.map(toName)).toEqual(["1", "2"]);

    const next = machine.execute(false);
    expect(next!.entry.name).toEqual("2");
    expect(next!.history.map(toName)).toEqual(["1"]);
  });

  it("progresses through history consecutively when current state name is within history", () => {
    const machine = makeMachine(
      [
        {
          fork: "Is Yes",
          requirements: ["yes"],
          states: [
            { name: "1", isDone: ["yes"] },
            {
              fork: "Is Yes",
              requirements: ["yes"],
              states: [
                { name: "2", isDone: ["yes"] },
                { name: "3", isDone: ["yes"] },
                { name: "4", isDone: ["no"] },
              ],
            },
            { name: "5", isDone: ["no"] },
          ],
        },
      ],
      void null,
      basicConditions
    );
    const retainedHistory = ["1", "2", "3"];
    expect(machine.initial!.entry.name).toEqual("4");
    expect(machine.initial!.history.map(toName)).toEqual(retainedHistory);

    const next = machine.execute(void null, "2");
    expect(next!.entry.name).toEqual("3");
    expect(next!.history.map(toName)).toEqual(retainedHistory);
  });

  it("doesn't progress through history when current state name is within history, but the context has changed the flow", () => {
    const machine = makeMachine(
      [
        {
          fork: "Is Yes",
          requirements: ["yes"],
          states: [
            { name: "1", isDone: ["yes"] },
            {
              fork: "Maybe",
              requirements: ["maybe"],
              states: [
                { name: "2", isDone: ["yes"] },
                { name: "3", isDone: ["yes"] },
                { name: "4", isDone: ["no"] },
              ],
            },
            { name: "5", isDone: ["no"] },
          ],
        },
      ],
      true,
      { ...basicConditions, maybe: (isYes) => isYes }
    );
    const retainedHistory = ["1", "2", "3"];
    expect(machine.initial!.entry.name).toEqual("4");
    expect(machine.initial!.history.map(toName)).toEqual(retainedHistory);

    const next = machine.execute(false, "1");
    expect(next!.entry.name).toEqual("5");
    expect(next!.history.map(toName)).not.toEqual(retainedHistory);
    expect(next!.history.map(toName)).toEqual(["1"]);
  });
});

describe("free beer example", () => {
  type Context = {
    age?: number;
    name?: string;
    address?: string;
    jobTitle?: string;
    salary?: number;
    bypassPostcodeLookup: boolean;
  };
  const initialContext: Context = {
    bypassPostcodeLookup: false,
  };
  const machine = makeMachine(
    [
      {
        name: "How old are you?",
        isDone: ["hasEnteredAge"],
      },
      {
        fork: "Is old enough",
        requirements: ["isOfLegalDrinkingAge"],
        states: [
          { name: "What's your name?", isDone: ["hasEnteredName"] },
          { name: "What's your postcode?", isDone: ["hasEnteredAddress"] },
          {
            fork: "Bypassed postcode lookup",
            requirements: ["hasBypassedPostcodeLookup"],
            states: [
              {
                name: "What's your address?",
                isDone: ["hasEnteredAddress"],
              },
            ],
          },
          { name: "What's your job title?", isDone: ["hasEnteredJobTitle"] },
          { name: "What's your salary?", isDone: ["hasEnteredSalary"] },
          {
            fork: "If you're rich?",
            requirements: ["isRich"],
            states: [
              {
                name: "Sorry, you earn too much money for free beer",
                isDone: ["no"],
              },
            ],
          },
          { name: "Yay! You can have free beer", isDone: ["no"] },
        ],
      },
      {
        fork: "Is too young",
        requirements: ["isTooYoung"],
        states: [
          { name: "Sorry, you're too young for free beer", isDone: ["no"] },
        ],
      },
    ],
    initialContext,
    {
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
      hasBypassedPostcodeLookup: (ctx) => ctx.bypassPostcodeLookup,
    }
  );

  it("initialises", () => {
    expect(machine.initial!.entry.name).toEqual("How old are you?");
  });

  it("exits early if the applicant is too young", () => {
    const result = machine.execute({ ...initialContext, age: 16 });
    expect(result!.history.map(toName)).toEqual(["How old are you?"]);
    expect(result!.entry.name).toEqual("Sorry, you're too young for free beer");
  });

  it("asks for the applicants name", () => {
    const result = machine.execute({ ...initialContext, age: 22 });
    expect(result!.history.map(toName)).toEqual(["How old are you?"]);
    expect(result!.entry.name).toEqual("What's your name?");
  });

  it("asks for the applicants postcode", () => {
    const result = machine.execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
    });
    expect(result!.history.map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
    ]);
    expect(result!.entry.name).toEqual("What's your postcode?");
  });

  it("skips over the address section if the postcode lookup was used to enter the address", () => {
    const result = machine.execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
      address: "31 The Street",
    });
    expect(result!.history.map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
      "What's your postcode?",
    ]);
    expect(result!.entry.name).toEqual("What's your job title?");
  });

  it("asks for the applicant's address section if the postcode lookup was bypassed", () => {
    const result = machine.execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
      bypassPostcodeLookup: true,
    });
    expect(result!.history.map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
      // TODO: should postcode be here?
    ]);
    expect(result!.entry.name).toEqual("What's your address?");
  });

  it("progresses after bypassing postcode lookup and entering address", () => {
    const result = machine.execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
      bypassPostcodeLookup: true,
      address: "31 The Street",
    });
    expect(result!.history.map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
      "What's your postcode?",
      "What's your address?",
    ]);
    expect(result!.entry.name).toEqual("What's your job title?");
  });
});

const cond = (val: boolean) => () => val;

const basicConditions = {
  yes: cond(true),
  no: cond(false),
};

const toName = (entry: Entry<any, any>) => entry.name;
