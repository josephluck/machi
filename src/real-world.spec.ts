import { makeMachine, Entry, isEntry, State } from "./machine";

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
  const execute = makeMachine<Context, {}>(
    [
      {
        id: "How old are you?",
        isDone: ["hasEnteredAge"],
      },
      {
        fork: "Is old enough",
        requirements: ["isOfLegalDrinkingAge"],
        states: [
          { id: "What's your name?", isDone: ["hasEnteredName"] },
          { id: "What's your postcode?", isDone: ["hasEnteredAddress"] },
          {
            fork: "Bypassed postcode lookup",
            requirements: ["hasBypassedPostcodeLookup"],
            states: [
              {
                id: "What's your address?",
                isDone: ["hasEnteredAddress"],
              },
            ],
          },
          { id: "What's your job title?", isDone: ["hasEnteredJobTitle"] },
          { id: "What's your salary?", isDone: ["hasEnteredSalary"] },
          {
            fork: "If you're rich?",
            requirements: ["isRich"],
            states: [
              {
                id: "Sorry, you're to rich for free beer",
                isDone: ["no"],
              },
            ],
          },
          { id: "Yay! You can have free beer", isDone: ["no"] },
        ],
      },
      {
        fork: "Is too young",
        requirements: ["isTooYoung"],
        states: [
          { id: "Sorry, you're too young for free beer", isDone: ["no"] },
        ],
      },
    ],
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
    const result = execute(initialContext);
    expect(result!.entry.id).toEqual("How old are you?");
  });

  it("exits early if the applicant is too young", () => {
    const result = execute({ ...initialContext, age: 16 });
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
    ]);
    expect(result!.entry.id).toEqual("Sorry, you're too young for free beer");
  });

  it("asks for the applicants id", () => {
    const result = execute({ ...initialContext, age: 22 });
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
    ]);
    expect(result!.entry.id).toEqual("What's your name?");
  });

  it("asks for the applicants postcode", () => {
    const result = execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
    });
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
    ]);
    expect(result!.entry.id).toEqual("What's your postcode?");
  });

  it("skips over the address section if the postcode lookup was used to enter the address", () => {
    const result = execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
      address: "31 The Street",
    });
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
      "What's your postcode?",
    ]);
    expect(result!.entry.id).toEqual("What's your job title?");
  });

  it("asks for the applicant's address section if the postcode lookup was bypassed", () => {
    const result = execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
      bypassPostcodeLookup: true,
    });
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
      // TODO: should postcode be here?
    ]);
    expect(result!.entry.id).toEqual("What's your address?");
  });

  it("progresses after bypassing postcode lookup and entering address", () => {
    const result = execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
      bypassPostcodeLookup: true,
      address: "31 The Street",
    });
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
      "What's your postcode?",
      "What's your address?",
    ]);
    expect(result!.entry.id).toEqual("What's your job title?");
  });

  it("asks for the applicant's salary", () => {
    const result = execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
      address: "31 The Street",
      jobTitle: "Waiter",
    });
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
      "What's your postcode?",
      "What's your job title?",
    ]);
    expect(result!.entry.id).toEqual("What's your salary?");
  });

  it("tells the applicant they're too rich", () => {
    const result = execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
      address: "31 The Street",
      jobTitle: "Lawyer",
      salary: 240000,
    });
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
      "What's your postcode?",
      "What's your job title?",
      "What's your salary?",
    ]);
    expect(result!.entry.id).toEqual("Sorry, you're to rich for free beer");
  });

  it("gives the applicant free beer", () => {
    const result = execute({
      ...initialContext,
      age: 22,
      name: "Sarah",
      address: "31 The Street",
      jobTitle: "Bartender",
      salary: 20000,
    });
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
      "What's your name?",
      "What's your postcode?",
      "What's your job title?",
      "What's your salary?",
    ]);
    expect(result!.entry.id).toEqual("Yay! You can have free beer");
  });

  it.skip("progresses through history from start to finish", () => {
    const ctx = {
      ...initialContext,
      age: 22,
      name: "Sarah",
      address: "31 The Street",
      jobTitle: "Bartender",
      salary: 20000,
    };
    const history = [
      "How old are you?",
      "What's your name?",
      "What's your postcode?",
      "What's your job title?",
      "What's your salary?",
    ];
    history.forEach((item, i) => {
      const result = execute(ctx, item);
      if (i === history.length - 1) {
        expect(result!.entry.id).toEqual("Yay! You can have free beer");
      } else {
        expect(result!.entry.id).toEqual(history[i + 1]);
      }
      expect(extractEntries(result!.history).map(toName)).toEqual(history);
    });
  });

  it("switches back to an alternate journey when the applicant goes back and changes their answer", () => {
    const ctx = {
      ...initialContext,
      age: 22,
      name: "Sarah",
      address: "31 The Street",
      jobTitle: "Bartender",
    };
    const initial = execute(ctx);
    const result = execute({ ...ctx, age: 10 }, initial!.entry.id);
    expect(result!.entry.id).toEqual("Sorry, you're too young for free beer");
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
    ]);
  });
});

const extractEntries = (states: State<any, any, {}>[]): Entry<any, any, {}>[] =>
  states.filter(isEntry) as Entry<any, any, {}>[];

const toName = (entry: Entry<any, any, {}>) => entry.id;
