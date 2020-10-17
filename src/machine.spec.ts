import { makeMachine, State } from "./machine";

const cond = (val: boolean) => () => val;

const basicConditions = {
  yes: cond(true),
  no: cond(false),
};

describe("state machine", () => {
  it("initialises a simple machine", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          cond: ["yes"],
        },
      ],
      void null,
      basicConditions
    );

    expect(machine.initial!.state.name).toEqual("1");
    expect(machine.initial!.history.map(toName)).toEqual(["1"]);
  });

  it("initialises to a deep state based on context", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          cond: ["yes"],
          states: [
            {
              name: "1/1",
              cond: ["yes"],
            },
            { name: "1/2", cond: ["no"] },
            {
              name: "1/3",
              cond: ["yes"],
              states: [
                { name: "1/3/1", cond: ["yes"] },
                { name: "1/3/2", cond: ["no"] },
                { name: "1/3/3", cond: ["yes"] },
              ],
            },
            {
              name: "1/4",
              cond: ["no"],
            },
          ],
        },
      ],
      void null,
      basicConditions
    );

    expect(machine.initial!.state.name).toEqual("1/3/3");
    expect(machine.initial!.history.map(toName)).toEqual([
      "1",
      "1/1",
      "1/3",
      "1/3/1",
      "1/3/3",
    ]);
  });

  it("correctly determines next state and history when machine context is updated", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          cond: ["yes"],
          states: [
            { name: "1/1", cond: ["yes"] },
            { name: "1/2", cond: ["evaluate"] },
            { name: "1/3", cond: ["no"] },
          ],
        },
        { name: "2", cond: ["no"] },
      ],
      false,
      { ...basicConditions, evaluate: (pass) => pass }
    );
    expect(machine.initial!.state.name).toEqual("1/1");

    const next = machine.execute(true);
    expect(next!.state.name).toEqual("1/2");
    expect(next!.history.map(toName)).toEqual(["1", "1/1", "1/2"]);
  });

  it("correctly goes back to previous state when the machines context is updated", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          cond: ["yes"],
          states: [
            { name: "1/1", cond: ["yes"] },
            { name: "1/2", cond: ["evaluate"] },
            { name: "1/3", cond: ["no"] },
          ],
        },
        { name: "2", cond: ["no"] },
      ],
      true,
      { ...basicConditions, evaluate: (pass) => pass }
    );

    expect(machine.initial!.state.name).toEqual("1/2");
    expect(machine.initial!.history.map(toName)).toEqual(["1", "1/1", "1/2"]);

    const next = machine.execute(false);
    expect(next!.state.name).toEqual("1/1");
    expect(next!.history.map(toName)).toEqual(["1", "1/1"]);
  });

  it("progresses through history consecutively when current state name is within history", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          cond: ["yes"],
          states: [
            { name: "1/1", cond: ["yes"] },
            {
              name: "1/2",
              cond: ["yes"],
              states: [
                { name: "1/2/1", cond: ["yes"] },
                { name: "1/2/2", cond: ["yes"] },
                { name: "1/2/3", cond: ["no"] },
              ],
            },
            { name: "1/3", cond: ["no"] },
          ],
        },
      ],
      void null,
      basicConditions
    );
    const retainedHistory = ["1", "1/1", "1/2", "1/2/1", "1/2/2"];
    expect(machine.initial!.state.name).toEqual("1/2/2");
    expect(machine.initial!.history.map(toName)).toEqual(retainedHistory);

    const next = machine.execute(void null, "1/2");
    expect(next!.state.name).toEqual("1/2/1");
    expect(next!.history.map(toName)).toEqual(retainedHistory);
  });

  it("doesn't progress through history when current state name is within history, but the context has changed the flow", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          cond: ["yes"],
          states: [
            { name: "1/1", cond: ["yes"] },
            {
              name: "1/2",
              cond: ["evaluate"],
              states: [
                { name: "1/2/1", cond: ["yes"] },
                { name: "1/2/2", cond: ["yes"] },
                { name: "1/2/3", cond: ["no"] },
              ],
            },
            { name: "1/3", cond: ["evaluateInverse"] },
          ],
        },
      ],
      true,
      {
        ...basicConditions,
        evaluate: (pass) => pass,
        evaluateInverse: (pass) => !pass,
      }
    );
    expect(machine.initial!.state.name).toEqual("1/2/2");
    expect(machine.initial!.history.map(toName)).toEqual([
      "1",
      "1/1",
      "1/2",
      "1/2/1",
      "1/2/2",
    ]);

    const next = machine.execute(false, "1/2");
    expect(next!.state.name).toEqual("1/3");
    expect(next!.history.map(toName)).toEqual(["1", "1/1", "1/3"]);
  });
});

const toName = (state: State<any, any>) => state.name;
