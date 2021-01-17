import { generateStateLinks, StateLink } from "../graph/generate-state-links";
import { ConditionsMap, isForkInternal, State } from "../machine";

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
) => {
  let result: StateLink<Context, Conditions, AdditionalEntryData>[][] = [];

  const iterate = (nameOrId: string, useId: boolean = false) => {
    const links = useId
      ? findLinksToStateById(nameOrId, allLinks)
      : findLinksToStateByName(nameOrId, allLinks);

    /**
     * No links found, we've reached the beginning of the machine.
     */
    if (!links.length) {
      return;
    }

    /**
     * No pathways yet, we're at the beginning of the pathways traversal.
     * Begin by creating pathways for each link to the first state, and kick off
     * iteration for each of the links' "from" state.
     */
    if (!result.length) {
      links.forEach((link) => {
        result.unshift([link]);
        iterate(link.from._internalStateId, true);
      });

      return;
    }

    const [firstPathway] = result;

    links.forEach((link, i) => {
      if (i === 0) {
        // The first link will be added to the first pathway.
        result[0] = [link, ...firstPathway];
      } else {
        // The remaining links duplicate an existing pathway, and add the link
        // to it.
        result.unshift([link, ...firstPathway]);
      }
      // Then we kick off iteration for the link's "from" state.
      iterate(link.from._internalStateId, true);
    });
  };

  iterate(name);

  // Sort the pathways by shortest-first
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
