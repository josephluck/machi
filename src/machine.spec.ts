import { makeMachine, Entry, State, isEntry } from "./machine";

describe("state machine", () => {
  it("initialises a simple machine", () => {
    const execute = makeMachine(
      [
        {
          name: "1",
          isDone: ["no"],
        },
      ],
      basicConditions
    );

    const result = execute();
    expect(result!.entry.name).toEqual("1");
    expect(extractEntries(result!.history).map(toName)).toEqual([]);
  });

  it("initialises a simple machine with multiple conditions", () => {
    const execute = makeMachine(
      [
        {
          name: "1",
          isDone: ["yes", "overrideWithNo"],
        },
      ],
      { ...basicConditions, overrideWithNo: () => false }
    );

    const result = execute();

    expect(result!.entry.name).toEqual("1");
    expect(extractEntries(result!.history).map(toName)).toEqual([]);
  });

  it("builds up history from a simple machine", () => {
    const execute = makeMachine(
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
      basicConditions
    );

    const result = execute();

    expect(result!.entry.name).toEqual("4");
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("initialises to a deep state based on context", () => {
    const execute = makeMachine(
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
      basicConditions
    );

    const result = execute();

    expect(result!.entry.name).toEqual("4");
    expect(extractEntries(result!.history).map(toName)).toEqual(["1", "2"]);
  });

  it("skips over a fork if all it's entries are done", () => {
    const execute = makeMachine(
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
      basicConditions
    );

    const result = execute();

    expect(result!.entry.name).toEqual("6");
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("enters the correct fork if there are multiple competing forks", () => {
    const execute = makeMachine(
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
      basicConditions
    );

    const result = execute();

    expect(result!.entry.name).toEqual("7");
    expect(extractEntries(result!.history).map(toName)).toEqual([
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
  });

  it("correctly determines next state and history when machine context is updated", () => {
    const execute = makeMachine<boolean>(
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
      { ...basicConditions, maybe: (isYes) => isYes }
    );

    const result = execute(false);

    expect(result!.entry.name).toEqual("2");
    expect(extractEntries(result!.history).map(toName)).toEqual(["1"]);

    const next = execute(true);
    expect(next!.entry.name).toEqual("3");
    expect(extractEntries(next!.history).map(toName)).toEqual(["1", "2"]);
  });

  it("correctly goes back to previous state when the machines context is updated", () => {
    const execute = makeMachine<boolean>(
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
      { ...basicConditions, maybe: (isYes) => isYes }
    );

    const result = execute(true);

    expect(result!.entry.name).toEqual("3");
    expect(extractEntries(result!.history).map(toName)).toEqual(["1", "2"]);

    const next = execute(false);
    expect(next!.entry.name).toEqual("2");
    expect(extractEntries(next!.history).map(toName)).toEqual(["1"]);
  });

  it("includes forks in history", () => {
    const execute = makeMachine(
      [
        {
          fork: "Yes",
          requirements: ["yes"],
          states: [
            {
              name: "1",
              isDone: ["yes"],
            },
            {
              fork: "Yes again",
              requirements: ["yes"],
              states: [{ name: "2", isDone: ["yes"] }],
            },
            {
              fork: "Yes again and again",
              requirements: ["yes"],
              states: [
                { name: "3", isDone: ["yes"] },
                {
                  fork: "No",
                  requirements: ["no"],
                  states: [{ name: "4", isDone: ["no"] }],
                },
              ],
            },
            {
              name: "5",
              isDone: ["no"],
            },
          ],
        },
      ],
      basicConditions
    );
    const result = execute();
    expect(result?.history.map(toName)).toEqual([
      "Yes",
      "1",
      "Yes again",
      "2",
      "Yes again and again",
      "3",
    ]);
  });

  it("progresses through history consecutively when current state name is within history", () => {
    const execute = makeMachine(
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
      basicConditions
    );

    const result = execute();

    const retainedHistory = ["1", "2", "3"];
    expect(result!.entry.name).toEqual("4");
    expect(extractEntries(result!.history).map(toName)).toEqual(
      retainedHistory
    );

    const next = execute(void null, "2");
    expect(next!.entry.name).toEqual("3");
    expect(extractEntries(next!.history).map(toName)).toEqual(retainedHistory);
  });

  it("doesn't progress through history when current state name is within history, but the context has changed the flow", () => {
    const execute = makeMachine<boolean>(
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
      { ...basicConditions, maybe: (isYes) => isYes }
    );

    const result = execute(true);

    const retainedHistory = ["1", "2", "3"];
    expect(result!.entry.name).toEqual("4");
    expect(extractEntries(result!.history).map(toName)).toEqual(
      retainedHistory
    );

    const next = execute(false, "1");
    expect(next!.entry.name).toEqual("5");
    expect(extractEntries(next!.history).map(toName)).not.toEqual(
      retainedHistory
    );
    expect(extractEntries(next!.history).map(toName)).toEqual(["1"]);
  });
});

const cond = (val: boolean) => () => val;

const basicConditions = {
  yes: cond(true),
  no: cond(false),
};

const extractEntries = (states: State<any, any>[]): Entry<any, any>[] =>
  states.filter(isEntry) as Entry<any, any>[];

const toName = (state: State<any, any>) =>
  isEntry(state) ? state.name : state.fork;
