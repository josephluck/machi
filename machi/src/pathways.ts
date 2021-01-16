import { generateStateLinks, StateLink } from "./graph/generate-state-links";
import { ConditionsMap, isForkInternal, State } from "./machine";

const pathways = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  toName: string,
  states: State<Context, Conditions, AdditionalEntryData>[],
  links = generateStateLinks(states).filter(
    (link) => link.type === "link"
  ) as StateLink<Context, Conditions, AdditionalEntryData>[],
  toId?: string
): StateLink<Context, Conditions, AdditionalEntryData>[][] => {
  const branches = toId
    ? findLinksToStateById(toId, links)
    : findLinksToStateByName(toName, links);

  return branches.map((branch) => {
    const ways = pathways(
      extractFromNameFromLink(branch),
      states,
      links,
      extractFromInternalIdFromLink(branch)
    );

    return ways.length
      ? ways.reduce((acc, way) => [...way, ...acc], [branch])
      : [branch];
  });
};

export const getPathwaysToState = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  toName: string,
  states: State<Context, Conditions, AdditionalEntryData>[]
): StateLink<Context, Conditions, AdditionalEntryData>[][] =>
  pathways(toName, states).sort((a, b) => a.length - b.length);

const findLinksToStateByName = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  name: string,
  links: StateLink<Context, Conditions, AdditionalEntryData>[]
): StateLink<Context, Conditions, AdditionalEntryData>[] =>
  links.filter((link) =>
    isForkInternal(link.to) ? link.to.fork === name : link.to.id === name
  );

const findLinksToStateById = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  id: string,
  links: StateLink<Context, Conditions, AdditionalEntryData>[]
): StateLink<Context, Conditions, AdditionalEntryData>[] =>
  links.filter((link) => link.to._internalStateId === id);

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

const extractFromInternalIdFromLink = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  link: StateLink<Context, Conditions, AdditionalEntryData>
): string => link.from._internalStateId || "unknown";
