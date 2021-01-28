import React from "react";
import ReactDOM from "react-dom";
import { states as rawStates } from "./states";
import { Graph } from "./ui/graph";
import {
  generateNodesAndEdges,
  GraphEdge,
  GraphNode,
} from "./graph/generate-nodes-and-edges";
import styled, { createGlobalStyle } from "styled-components";
import { useState } from "react";
import {
  StateLink,
  generateStateLinks,
} from "@josephluck/machi/src/graph/generate-state-links";
import {
  EntryInternal,
  ForkInternal,
  isEntryInternal,
  isForkInternal,
  StateInternal,
  uniquifyStates,
} from "@josephluck/machi/src/machine";
import { useContext } from "react";
import { createContext } from "react";

const allStates = uniquifyStates(rawStates);

export type HiddenFork = {
  _internalStateId: string;
  /**
   * NB: multiple variants share the same _internalStateId
   */
  _internalVariantId: string;
};

type GlobalStatesContextType = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  toggleForkVisibility: (entry: ForkInternal<any, any, {}>) => void;
  toggleEntryVisibility: (entry: EntryInternal<any, any, {}>) => void;
  hiddenIds: string[];
  hiddenForks: HiddenFork[];
};

const GlobalStatesContext = createContext<GlobalStatesContextType>({
  nodes: [],
  edges: [],
  toggleForkVisibility: () => null,
  toggleEntryVisibility: () => null,
  hiddenIds: [],
  hiddenForks: [],
});

const GlobalStatesProvider = ({ children }: { children: React.ReactNode }) => {
  const allLinks = generateStateLinks(allStates as any).filter(
    (link) => link.type === "link"
  ) as StateLink<any, any, {}>[];

  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [hiddenForks, setHiddenForks] = useState<HiddenFork[]>([]);

  const { nodes, edges } = generateNodesAndEdges(
    allLinks,
    hiddenIds,
    hiddenForks
  );

  const toggleEntryVisibility = (entry: EntryInternal<any, any, {}>) => {
    setHiddenIds((ids) =>
      ids.includes(entry._internalStateId)
        ? ids.filter((i) => i !== entry._internalStateId)
        : [...ids, entry._internalStateId]
    );
  };

  const toggleForkVisibility = (fork: ForkInternal<any, any, {}>) => {
    const isHidden = !!hiddenForks.find(
      (f) =>
        f._internalStateId === fork._internalStateId &&
        f._internalVariantId === fork._internalVariantId
    );

    setHiddenForks(
      isHidden
        ? hiddenForks.filter(
            (f) =>
              f._internalStateId !== fork._internalStateId &&
              f._internalVariantId !== fork._internalVariantId
          )
        : [
            ...hiddenForks,
            {
              _internalStateId: fork._internalStateId,
              _internalVariantId: fork._internalVariantId,
            },
          ]
    );
    setHiddenIds((ids) => {
      const forkIds = getAllForkIds(fork);
      if (isHidden) {
        return ids.filter((id) => !forkIds.includes(id));
      } else {
        return [...new Set([...ids, ...forkIds])];
      }
    });
  };

  return (
    <GlobalStatesContext.Provider
      value={{
        nodes,
        edges,
        toggleForkVisibility,
        toggleEntryVisibility,
        hiddenIds,
        hiddenForks,
      }}
    >
      {children}
    </GlobalStatesContext.Provider>
  );
};

const useGlobalStates = () => useContext(GlobalStatesContext);

const App = () => {
  return (
    <GlobalStatesProvider>
      <Wrapper>
        <GlobalStyle />
        <Visualiser />
        <Sidebar>
          <States states={allStates} />
        </Sidebar>
      </Wrapper>
    </GlobalStatesProvider>
  );
};

const Visualiser = () => {
  const { nodes, edges } = useGlobalStates();

  return <Graph nodes={nodes} edges={edges} />;
};

const States = ({ states }: { states: StateInternal<any, any, {}>[] }) => {
  const {
    toggleEntryVisibility,
    toggleForkVisibility,
    hiddenIds,
    hiddenForks,
  } = useGlobalStates();
  return (
    <>
      {states.map((state) => (
        <div style={{ marginLeft: 10 }}>
          <div
            onClick={() =>
              isEntryInternal(state)
                ? toggleEntryVisibility(state)
                : toggleForkVisibility(state)
            }
          >
            <input
              type="checkbox"
              checked={
                isEntryInternal(state)
                  ? !hiddenIds.includes(state._internalStateId)
                  : !(
                      hiddenForks.find(
                        (f) =>
                          f._internalStateId === state._internalStateId &&
                          f._internalVariantId === state._internalVariantId
                      ) || hiddenIds.includes(state._internalStateId)
                    )
              }
            />
            {isEntryInternal(state) ? state.id : state.fork}
          </div>
          {isForkInternal(state) ? <States states={state.states} /> : null}
        </div>
      ))}
    </>
  );
};

const GlobalStyle = createGlobalStyle`
  html,
  body,
  #root-elm {
    margin: 0;
    overflow: hidden;
    height: 100%;
    min-height: 100%;
  }

  * {
    box-sizing: border-box;
  }
`;

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 500px;
  height: 100%;
  overflow: auto;
  border-left: solid 1px black;
`;

const elm = document.createElement("div");
elm.id = "root-elm";
document.body.appendChild(elm);
ReactDOM.render(<App />, elm);

const getAllForkIds = (f: ForkInternal<any, any, {}>): string[] =>
  f.states.reduce(
    (acc, s) =>
      isForkInternal(s as any)
        ? [...acc, s._internalStateId, ...getAllForkIds(s as any)]
        : [...acc, s._internalStateId],
    [] as string[]
  );
