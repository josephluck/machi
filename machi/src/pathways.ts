import { generateStateLinks, StateLink } from "./graph/generate-state-links";
import { ConditionsMap, isForkInternal, State } from "./machine";

export const getPathwaysToState = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  name: string,
  states: State<Context, Conditions, AdditionalEntryData>[],
  allLinks = generateStateLinks(states).filter(
    (link) => link.type === "link"
  ) as StateLink<Context, Conditions, AdditionalEntryData>[]
): StateLink<Context, Conditions, AdditionalEntryData>[][] => {
  let result: StateLink<Context, Conditions, AdditionalEntryData>[][] = [];

  const iterate = (nameOrId: string, useId: boolean = false) => {
    const links = useId
      ? findLinksToStateById(nameOrId, allLinks)
      : findLinksToStateByName(nameOrId, allLinks);

    if (!links.length) {
      return;
    }

    if (!result.length) {
      links.forEach((link) => {
        result = [[link], ...result];
        iterate(link.from._internalStateId, true);
      });

      return;
    }

    const [firstPathway] = result;
    links.forEach((link, i) => {
      if (i === 0) {
        result[0] = [link, ...firstPathway];
      } else {
        result.unshift([link, ...firstPathway]);
      }
      iterate(link.from._internalStateId, true);
    });
  };

  iterate(name);

  return result.sort((a, b) => a.length - b.length);
};

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
