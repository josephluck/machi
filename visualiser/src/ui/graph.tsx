import React from "react";
import * as d3 from "d3";
import dagre from "dagre-d3";
import styled from "styled-components";
import { GraphNode, GraphEdge } from "../graph/generate-nodes-and-edges";

const renderer = new dagre.render();

export const Graph = ({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) => {
  const graph = new dagre.graphlib.Graph({ directed: true }).setGraph({});

  const setNodes = () => {
    nodes.forEach((node) => {
      graph.setNode(node.id, {
        label: node.label,
        class: node.visible ? "visible" : "hidden",
        rx: 6,
        ry: 6,
      });
    });
  };

  const setEdges = () =>
    edges.forEach((edge) =>
      graph.setEdge(edge.from, edge.to, {
        label: edge.visible ? edge.label : undefined,
        labelpos: "c",
        class: edge.visible ? "visible" : "hidden",
      })
    );

  const render = (elm: SVGSVGElement) => {
    setNodes();
    setEdges();

    const svg = d3.select(elm);
    const selectedG = svg.select("g");
    const g = selectedG.empty() ? svg.append("g") : selectedG;

    var zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    renderer(g as any, graph as any);
  };

  return <GraphRoot ref={render} />;
};

const GraphRoot = styled.svg`
  width: 100%;
  height: 100%;

  text {
    font-weight: 300;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 14px;
  }

  .node rect {
    stroke: #333;
    fill: #fff;
    stroke-width: 2px;
  }

  .hidden {
    opacity: 0 !important;
  }

  .edgePath path {
    stroke: #333;
    stroke-width: 1.5px;
  }
`;
