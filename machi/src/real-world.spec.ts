import { makeMachine, Entry, isEntryInternal, State, isEntry } from "./machine";

describe("auth flow", () => {
  type Context = {
    authenticationFlow: "splash" | "signUp" | "signIn";
    authType: "phone" | "email";
    phoneNumber?: string;
    emailAddress?: string;
    verificationId?: string;
    verificationCode?: string;
    password?: string;
    name?: string;
  };
  const execute = makeMachine<Context, {}>(
    [
      {
        id: "splashRoute",
        isDone: [(context) => context.authenticationFlow !== "splash"],
      },
      {
        fork: "Phone auth",
        requirements: [(context) => context.authType === "phone"],
        states: [
          {
            id: "signUpPhoneRoute",
            isDone: [
              (context) => !!context.phoneNumber,
              (context) => !!context.verificationId,
            ],
          },
          {
            id: "signUpPhoneVerifyRoute",
            isDone: [(context) => !!context.verificationCode],
          },
        ],
      },
      {
        fork: "Email auth",
        requirements: [(context) => context.authType === "email"],
        states: [
          {
            id: "signUpEmailRoute",
            isDone: [(context) => !!context.emailAddress],
          },
          {
            id: "signUpPasswordRoute",
            isDone: [(context) => !!context.password],
          },
        ],
      },
      {
        id: "signUpNameRoute",
        isDone: [(context) => !!context.name],
      },
    ],
    {}
  );

  it("initialises to the splash screen", () => {
    const result = execute({ authenticationFlow: "splash", authType: "phone" });
    expect(result?.entry.id).toEqual("splashRoute");
  });

  it("goes to the phone number route", () => {
    const result = execute({ authenticationFlow: "signUp", authType: "phone" });
    expect(result?.entry.id).toEqual("signUpPhoneRoute");
  });

  it("goes to phone number route when passing splash as current route", () => {
    const result = execute(
      { authenticationFlow: "signUp", authType: "phone" },
      "splashRoute"
    );
    expect(result?.entry.id).toEqual("signUpPhoneRoute");
  });

  it("stays on the phone number route until the verification sms has been sent", () => {
    const result = execute({
      authenticationFlow: "signUp",
      authType: "phone",
      phoneNumber: "+447123456789",
    });
    expect(result?.entry.id).toEqual("signUpPhoneRoute");
  });

  it("goes to the verify route when the verification sms has been sent", () => {
    const result = execute({
      authenticationFlow: "signUp",
      authType: "phone",
      phoneNumber: "+447123456789",
      verificationId: "abc123",
    });
    expect(result?.entry.id).toEqual("signUpPhoneVerifyRoute");
  });

  it("goes to the email route when passing phone number route as current route", () => {
    const result = execute(
      { authenticationFlow: "signUp", authType: "email" },
      "signUpPhoneRoute"
    );
    expect(result?.entry.id).toEqual("signUpEmailRoute");
  });

  it("allows going to the email route even after the verification sms has been sent", () => {
    const result = execute({
      authenticationFlow: "signUp",
      authType: "email",
      phoneNumber: "+447123456789",
      verificationId: "abc123",
    });
    expect(result?.entry.id).toEqual("signUpEmailRoute");
  });

  it("goes to the name route when the phone number has been verified", () => {
    const result = execute({
      authenticationFlow: "signUp",
      authType: "phone",
      phoneNumber: "+447123456789",
      verificationId: "abc123",
      verificationCode: "123456",
    });
    expect(result?.entry.id).toEqual("signUpNameRoute");
  });

  it("goes to the email route when the auth type is email", () => {
    const result = execute({
      authenticationFlow: "signUp",
      authType: "email",
    });
    expect(result?.entry.id).toEqual("signUpEmailRoute");
  });

  it("goes to the password route when the email has been provided", () => {
    const result = execute({
      authenticationFlow: "signUp",
      authType: "email",
      emailAddress: "foo@bar.com",
    });
    expect(result?.entry.id).toEqual("signUpPasswordRoute");
  });

  it("goes to the name route when the password has been provided", () => {
    const result = execute({
      authenticationFlow: "signUp",
      authType: "email",
      emailAddress: "foo@bar.com",
      password: "supersecret",
    });
    expect(result?.entry.id).toEqual("signUpNameRoute");
  });
});

describe("free beer example", () => {
  type Context = {
    age?: number;
    name?: string;
    postcode?: string;
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
          {
            id: "What's your postcode?",
            isDone: [
              function hasEnteredOrBypassedPostcodeLookup(ctx) {
                return !!ctx.postcode || ctx.bypassPostcodeLookup;
              },
            ],
          },
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
      hasEnteredPostcode: (ctx) => !!ctx.postcode,
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
      postcode: "AB3 2CD",
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
      "What's your postcode?",
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
      postcode: "AB1 2CD",
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
      postcode: "AB1 2CD",
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
      postcode: "AB1 2CD",
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

  it("progresses through history from start to finish", () => {
    const ctx = {
      ...initialContext,
      age: 22,
      name: "Sarah",
      postcode: "AB1 2CD",
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
      postcode: "AB1 2CD",
      address: "31 The Street",
      jobTitle: "Bartender",
    };
    const result = execute({ ...ctx, age: 10 }, "How old are you?");
    expect(result!.entry.id).toEqual("Sorry, you're too young for free beer");
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "How old are you?",
    ]);
  });
});

const extractEntries = (states: State<any, any, {}>[]): Entry<any, any, {}>[] =>
  states.filter(isEntry) as Entry<any, any, {}>[];

const toName = (entry: Entry<any, any, {}>) => entry.id;
