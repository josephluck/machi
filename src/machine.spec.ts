import { makeMachine } from "./machine";

const cond = (val: boolean) => () => val;

describe("state machine", () => {
  it("initialises a simple machine", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          cond: cond(true),
        },
      ],
      void null
    );

    expect(machine.initial!.state.name).toEqual("1");
    expect(machine.initial!.history.map((state) => state.name)).toEqual(["1"]);
  });

  it("initialises to a deep state based on context", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          cond: cond(true),
          states: [
            {
              name: "1/1",
              cond: cond(true),
            },
            { name: "1/2", cond: cond(false) },
            {
              name: "1/3",
              cond: cond(true),
              states: [
                { name: "1/3/1", cond: cond(true) },
                { name: "1/3/2", cond: cond(false) },
                { name: "1/3/3", cond: cond(true) },
              ],
            },
            {
              name: "1/4",
              cond: cond(false),
            },
          ],
        },
      ],
      void null
    );

    expect(machine.initial!.state.name).toEqual("1/3/3");
    expect(machine.initial!.history.map((state) => state.name)).toEqual([
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
          cond: cond(true),
          states: [
            { name: "1/1", cond: cond(true) },
            { name: "1/2", cond: (pass) => pass },
            { name: "1/3", cond: cond(false) },
          ],
        },
        { name: "2", cond: cond(false) },
      ],
      false
    );
    expect(machine.initial!.state.name).toEqual("1/1");

    const next = machine.execute(true);
    expect(next!.state.name).toEqual("1/2");
    expect(next!.history.map((state) => state.name)).toEqual([
      "1",
      "1/1",
      "1/2",
    ]);
  });

  it("correctly goes back to previous state when the machines context is updated", () => {
    const machine = makeMachine(
      [
        {
          name: "1",
          cond: cond(true),
          states: [
            { name: "1/1", cond: cond(true) },
            { name: "1/2", cond: (pass) => pass },
            { name: "1/3", cond: cond(false) },
          ],
        },
        { name: "2", cond: cond(false) },
      ],
      true
    );

    expect(machine.initial!.state.name).toEqual("1/2");
    expect(machine.initial!.history.map((state) => state.name)).toEqual([
      "1",
      "1/1",
      "1/2",
    ]);

    const next = machine.execute(false);
    expect(next!.state.name).toEqual("1/1");
    expect(next!.history.map((state) => state.name)).toEqual(["1", "1/1"]);
  });
});
