import { generateChart, generateChartFromPathways } from "./graph/files";
import { StateLink } from "./graph/generate-state-links";
import { ConditionsMap, isForkInternal, State } from "./machine";
import { getPathwaysToState } from "./pathways";

/**
 * It's worthwhile looking at the generated charts in screenshots/tests/ to see
 * what these machines look like. It'll make reading the tests a little easier.
 */

describe("Possible paths through a machine that uses exclusive forks", () => {
  const states: State<any, any, {}>[] = [
    {
      id: "E1",
      isDone: [
        function E1IsDone() {
          return true;
        },
      ],
    },
    {
      fork: "F1",
      requirements: [
        function F1IsTrue() {
          return true;
        },
      ],
      states: [
        {
          id: "E2",
          isDone: [
            function E2IsDone() {
              return true;
            },
          ],
        },
        {
          fork: "F2",
          requirements: [
            function F2IsTrue() {
              return true;
            },
          ],
          states: [
            {
              id: "E7",
              isDone: [],
            },
          ],
        },
        {
          id: "E3",
          isDone: [
            function E3IsDone() {
              return true;
            },
          ],
        },
      ],
    },
    {
      fork: "F1",
      requirements: [
        function F1IsFalse() {
          return true;
        },
      ],
      states: [
        {
          id: "E4",
          isDone: [
            function E4IsDone() {
              return true;
            },
          ],
        },
        {
          id: "E5",
          isDone: [
            function E5IsDone() {
              return true;
            },
          ],
        },
      ],
    },
    {
      id: "E6",
      isDone: [
        function E6IsDone() {
          return true;
        },
      ],
    },
  ];

  it("generates the chart (for debugging purposes)", async () => {
    await generateChart(
      { output: "../screenshots/tests/pathways-machine" },
      states
    );
  });

  it("gets possible paths to F1", () => {
    const result = getPathwaysToState("F1", states);
    expect(result.map(extractFromNamesFromLinks)).toEqual([["E1"]]);
  });

  it("gets possible paths to E2", () => {
    const result = getPathwaysToState("E2", states);
    expect(result.map(extractFromNamesFromLinks)).toEqual([["E1", "F1"]]);
  });

  it("gets possible paths to E6", () => {
    const result = getPathwaysToState("E6", states);
    expect(result.map(extractFromNamesFromLinks)).toEqual(
      expect.arrayContaining([
        ["E1", "F1", "E2", "F2", "E3"],
        ["E1", "F1"],
        ["E1", "F1", "E4", "E5"],
      ])
    );
  });

  it("gets possible paths to E7", () => {
    const result = getPathwaysToState("E7", states);
    expect(result.map(extractFromNamesFromLinks)).toEqual(
      expect.arrayContaining([["E1", "F1", "E2", "F2"]])
    );
  });

  it("orders possible paths by shortest path first", () => {
    const result = getPathwaysToState("E6", states);
    const lengths = result.map((arr) => arr.length);
    lengths.forEach((length, i) => {
      const nextLength = lengths[i + 1];
      if (nextLength) {
        expect(length).toBeLessThanOrEqual(nextLength);
      }
    });
  });

  it("generates a single chart for all possible pathways", async () => {
    const result = getPathwaysToState("E6", states);
    await generateChartFromPathways(
      {
        output: `../screenshots/tests/pathways-machine-mapped-result-combined`,
      },
      result
    );
  });
});

describe("Generates possible paths through a machine that uses skipped forks", () => {
  const states: State<{}, {}, {}>[] = [
    {
      id: "E1",
      isDone: [
        function E1IsDone() {
          return true;
        },
      ],
    },
    {
      fork: "F1",
      requirements: [
        function F1IsTrue() {
          return true;
        },
      ],
      states: [
        {
          id: "E2",
          isDone: [
            function E2IsDone() {
              return true;
            },
          ],
        },
      ],
    },
    {
      id: "E3",
      isDone: [
        function E3IsDone() {
          return true;
        },
      ],
    },
  ];

  it("generates the chart (for debugging purposes)", async () => {
    await generateChart(
      { output: "../screenshots/tests/pathways-machine-2" },
      states
    );
  });

  it("gets possible paths to F1", () => {
    const result = getPathwaysToState("F1", states);
    expect(result.map(extractFromNamesFromLinks)).toEqual(
      expect.arrayContaining([["E1"]])
    );
  });

  it("gets possible paths to E2", () => {
    const result = getPathwaysToState("E2", states);
    expect(result.map(extractFromNamesFromLinks)).toEqual(
      expect.arrayContaining([["E1", "F1"]])
    );
  });

  it("gets possible paths to E3", () => {
    const result = getPathwaysToState("E3", states);
    expect(result.map(extractFromNamesFromLinks)).toEqual(
      expect.arrayContaining([
        ["E1", "F1", "E2"],
        ["E1", "F1"],
      ])
    );
  });

  it("generates a single chart for all possible pathways", async () => {
    const result = getPathwaysToState("E3", states);
    await generateChartFromPathways(
      {
        output: `../screenshots/tests/pathways-machine-2-mapped-result-combined`,
      },
      result
    );
  });
});

describe("Generates possible paths through a machine that uses duplicate entry names", () => {
  const states: State<{}, {}, {}>[] = [
    {
      id: "E1",
      isDone: [
        function E1IsDone() {
          return true;
        },
      ],
    },
    {
      fork: "F1",
      requirements: [
        function F1IsTrue() {
          return true;
        },
      ],
      states: [
        {
          id: "E2",
          isDone: [
            function E2IsDone() {
              return true;
            },
          ],
        },
        {
          fork: "F3",
          requirements: [
            function F3IsTrue() {
              return true;
            },
          ],
          states: [
            {
              id: "E3",
              isDone: [
                function E3IsTrue() {
                  return true;
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "E3",
      isDone: [
        function E3IsDone() {
          return true;
        },
      ],
    },
  ];

  it("generates the chart (for debugging purposes)", async () => {
    await generateChart(
      { output: "../screenshots/tests/pathways-machine-3" },
      states
    );
  });

  it("gets possible paths to E3", () => {
    const result = getPathwaysToState("E3", states);
    expect(result.map(extractFromNamesFromLinks)).toEqual(
      expect.arrayContaining([
        ["E1", "F1"],
        ["E1", "F1", "E2", "F3"],
        ["E1", "F1", "E2", "F3"],
        ["E1", "F1", "E2", "F3", "E3"],
      ])
    );
  });

  it("generates a single chart for all possible pathways", async () => {
    const result = getPathwaysToState("E3", states);
    await generateChartFromPathways(
      {
        output: `../screenshots/tests/pathways-machine-3-mapped-result-combined`,
      },
      result
    );
  });
});

describe("Generates possible paths through a machine that has sibling forks", () => {
  const states: State<{}, {}, {}>[] = [
    {
      fork: "F1",
      requirements: [
        function F1IsTrue() {
          return true;
        },
      ],
      states: [
        {
          id: "E1",
          isDone: [
            function E1IsDone() {
              return true;
            },
          ],
        },
      ],
    },
    {
      fork: "F2",
      requirements: [
        function F2IsTrue() {
          return true;
        },
      ],
      states: [
        {
          id: "E2",
          isDone: [
            function E2IsDone() {
              return true;
            },
          ],
        },
      ],
    },
  ];

  it("generates all possible paths to E2", () => {
    const result = getPathwaysToState("E2", states);
    expect(result.map(extractFromNamesFromLinks)).toEqual(
      expect.arrayContaining([
        ["F1", "F2"],
        ["F1", "E1", "F2"],
      ])
    );
  });

  it("generates the chart (for debugging purposes)", async () => {
    await generateChart(
      { output: "../screenshots/tests/pathways-machine-4" },
      states
    );
  });

  it("generates a single chart for all possible pathways", async () => {
    const result = getPathwaysToState("E2", states);
    await generateChartFromPathways(
      {
        output: `../screenshots/tests/pathways-machine-4-mapped-result-combined`,
      },
      result
    );
  });
});

export const extractFromNamesFromLinks = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  links: StateLink<Context, Conditions, AdditionalEntryData>[]
): string[] => links.map(extractFromNameFromLink);

const extractFromNameFromLink = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  link: StateLink<Context, Conditions, AdditionalEntryData>
): string =>
  isForkInternal(link.from)
    ? link.from.fork
    : link.from
    ? link.from.id
    : "unknown";
