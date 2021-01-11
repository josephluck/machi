import { generateStateLinks } from "./graph/generate-state-links";
import { StateLink } from "./graph/utils";
import { Condition, isFork, State } from "./machine";

const pathways = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  toName: string,
  states: State<Context, Conditions, AdditionalEntryData>[],
  links = generateStateLinks(states).filter(
    (link) => link.type === "link"
  ) as StateLink<Context, Conditions, AdditionalEntryData>[]
): StateLink<Context, Conditions, AdditionalEntryData>[][] => {
  const branches = findLinksToState(toName, links);

  if (branches.length === 0) {
    return [];
  }

  return branches.map((branch) => {
    const ways = pathways(extractFromNameFromLink(branch), states);

    if (ways.length) {
      return ways.reduce((acc, way) => [...way, ...acc, branch], []);
    }

    return [branch];
  });
};

export const getPathwaysToState = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  toName: string,
  states: State<Context, Conditions, AdditionalEntryData>[]
): StateLink<Context, Conditions, AdditionalEntryData>[][] =>
  pathways(toName, states).sort((a, b) => a.length - b.length);

const findLinksToState = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  name: string,
  links: StateLink<Context, Conditions, AdditionalEntryData>[]
): StateLink<Context, Conditions, AdditionalEntryData>[] =>
  links.filter((link) =>
    isFork(link.to) ? link.to.fork === name : link.to.id === name
  );

export const extractFromNamesFromLinks = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  links: StateLink<Context, Conditions, AdditionalEntryData>[]
): string[] => links.map(extractFromNameFromLink);

const extractFromNameFromLink = <
  Context,
  Conditions extends { [key: string]: Condition<Context> },
  AdditionalEntryData
>(
  link: StateLink<Context, Conditions, AdditionalEntryData>
): string =>
  isFork(link.from) ? link.from.fork : link.from ? link.from.id : "unknown";
