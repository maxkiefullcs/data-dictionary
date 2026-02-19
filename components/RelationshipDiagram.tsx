"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dagre from "dagre";
import type { RelationshipRow } from "@/components/RelationshipPanel";

type RelationshipDiagramProps = {
  rows: RelationshipRow[];
  selectedTable: string;
  allTablesValue: string;
  onJumpToColumn: (tableName: string, columnName: string) => void;
};

type NodeMeta = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  outbound: number;
  inbound: number;
};

type EdgeMeta = {
  id: string;
  source: string;
  target: string;
  sourceColumn: string;
  targetColumn: string;
  constraintName: string;
  color: string;
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
};

type HoverTip = {
  x: number;
  y: number;
  text: string;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 84;
const MAX_EDGES = 320;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const DEFAULT_ZOOM = 1;
const DEFAULT_EXPORT_SCALE = 6;
const MAX_EXPORT_DIMENSION = 16384;
const MAX_EXPORT_PIXELS = 120_000_000;

function edgeColor(
  row: RelationshipRow,
  selectedTable: string,
  allTablesValue: string
): string {
  if (!selectedTable || selectedTable === allTablesValue) return "#8ba3bd";
  if (row.source_table === selectedTable) return "#facc15";
  if (row.target_table === selectedTable) return "#38bdf8";
  return "#64748b";
}

export default function RelationshipDiagram({
  rows,
  selectedTable,
  allTablesValue,
  onJumpToColumn,
}: RelationshipDiagramProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const diagramWrapRef = useRef<HTMLDivElement | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null);

  const edgeRows = useMemo(() => rows.slice(0, MAX_EDGES), [rows]);

  const { nodes, edges, canvasWidth, canvasHeight } = useMemo(() => {
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: "LR", ranksep: 90, nodesep: 50, marginx: 24, marginy: 24 });
    graph.setDefaultEdgeLabel(() => ({}));

    const nodeIds = new Set<string>();
    for (const row of edgeRows) {
      nodeIds.add(row.source_table);
      nodeIds.add(row.target_table);
    }

    for (const id of Array.from(nodeIds)) {
      graph.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const row of edgeRows) {
      graph.setEdge(row.source_table, row.target_table);
    }

    dagre.layout(graph);

    const nodeMap = new Map<string, NodeMeta>();
    for (const id of Array.from(nodeIds)) {
      const node = graph.node(id) as { x: number; y: number; width: number; height: number };
      nodeMap.set(id, {
        id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        outbound: edgeRows.filter((r) => r.source_table === id).length,
        inbound: edgeRows.filter((r) => r.target_table === id).length,
      });
    }

    let maxX = 0;
    let maxY = 0;
    for (const node of Array.from(nodeMap.values())) {
      maxX = Math.max(maxX, node.x + NODE_WIDTH / 2);
      maxY = Math.max(maxY, node.y + NODE_HEIGHT / 2);
    }

    const edgeList: EdgeMeta[] = edgeRows
      .map((row, idx) => {
        const source = nodeMap.get(row.source_table);
        const target = nodeMap.get(row.target_table);
        if (!source || !target) return null;

        return {
          id: `${row.constraint_name}-${row.source_table}-${row.source_column}-${row.target_table}-${row.target_column}-${idx}`,
          source: row.source_table,
          target: row.target_table,
          sourceColumn: row.source_column,
          targetColumn: row.target_column,
          constraintName: row.constraint_name,
          color: edgeColor(row, selectedTable, allTablesValue),
          sourcePoint: { x: source.x + source.width / 2, y: source.y },
          targetPoint: { x: target.x - target.width / 2, y: target.y },
        };
      })
      .filter((edge): edge is EdgeMeta => Boolean(edge));

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
      canvasWidth: Math.max(900, maxX + 48),
      canvasHeight: Math.max(420, maxY + 48),
    };
  }, [allTablesValue, edgeRows, rows.length, selectedTable]);

  useEffect(() => {
    if (!selectedEdgeId) return;
    if (!edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [edges, selectedEdgeId]);

  useEffect(() => {
    if (!activeNodeId) return;
    if (!nodes.some((node) => node.id === activeNodeId)) {
      setActiveNodeId(null);
    }
  }, [activeNodeId, nodes]);

  const setZoomWithAnchor = useCallback((nextZoom: number) => {
    const wrapper = scrollRef.current;
    if (!wrapper) {
      setZoom(nextZoom);
      return;
    }
    const prevZoom = zoom;
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    if (Math.abs(clamped - prevZoom) < 0.001) return;
    const centerX = wrapper.clientWidth / 2;
    const centerY = wrapper.clientHeight / 2;
    const nextScrollLeft = (wrapper.scrollLeft + centerX) * (clamped / prevZoom) - centerX;
    const nextScrollTop = (wrapper.scrollTop + centerY) * (clamped / prevZoom) - centerY;
    setZoom(clamped);
    requestAnimationFrame(() => {
      wrapper.scrollLeft = Math.max(0, nextScrollLeft);
      wrapper.scrollTop = Math.max(0, nextScrollTop);
    });
  }, [zoom]);

  const handleZoomIn = useCallback(() => {
    setZoomWithAnchor(zoom + 0.2);
  }, [setZoomWithAnchor, zoom]);

  const handleZoomOut = useCallback(() => {
    setZoomWithAnchor(zoom - 0.2);
  }, [setZoomWithAnchor, zoom]);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  const handleFit = useCallback(() => {
    const wrapper = scrollRef.current;
    if (!wrapper) return;
    const fitX = (wrapper.clientWidth - 24) / canvasWidth;
    const fitY = (wrapper.clientHeight - 24) / canvasHeight;
    const fitZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(fitX, fitY)));
    setZoom(fitZoom);
    requestAnimationFrame(() => {
      wrapper.scrollLeft = 0;
      wrapper.scrollTop = 0;
    });
  }, [canvasHeight, canvasWidth]);

  const renderCanvasFromSvg = useCallback(async (scale: number) => {
    const svg = svgRef.current;
    if (!svg) throw new Error("Diagram is not ready");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to render diagram image"));
      });
      image.src = svgUrl;
      await loaded;

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(canvasWidth * scale));
      canvas.height = Math.max(1, Math.floor(canvasHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to create canvas context");
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }, [canvasHeight, canvasWidth]);

  const getSafeExportScale = useCallback(
    (requestedScale: number): number => {
      const baseWidth = Math.max(1, canvasWidth);
      const baseHeight = Math.max(1, canvasHeight);
      let safeScale = Math.max(0.25, requestedScale);

      const maxByDimension = Math.min(
        MAX_EXPORT_DIMENSION / baseWidth,
        MAX_EXPORT_DIMENSION / baseHeight
      );
      if (Number.isFinite(maxByDimension)) {
        safeScale = Math.min(safeScale, maxByDimension);
      }

      const maxByPixels = Math.sqrt(MAX_EXPORT_PIXELS / (baseWidth * baseHeight));
      if (Number.isFinite(maxByPixels)) {
        safeScale = Math.min(safeScale, maxByPixels);
      }

      return Math.max(0.25, safeScale);
    },
    [canvasHeight, canvasWidth]
  );

  const handleExportPng = useCallback(async () => {
    setExportingPng(true);
    try {
      const safeScale = getSafeExportScale(DEFAULT_EXPORT_SCALE);
      const canvas = await renderCanvasFromSvg(safeScale);
      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!pngBlob) {
        throw new Error("Failed to generate PNG export");
      }
      const pngUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `Relationships_Diagram_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1500);
    } finally {
      setExportingPng(false);
    }
  }, [getSafeExportScale, renderCanvasFromSvg]);

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const safeScale = getSafeExportScale(DEFAULT_EXPORT_SCALE);
      const canvas = await renderCanvasFromSvg(safeScale);
      const { jsPDF } = await import("jspdf");
      const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format: [canvas.width, canvas.height],
        compress: true,
      });
      const pngData = canvas.toDataURL("image/png");
      pdf.addImage(pngData, "PNG", 0, 0, canvas.width, canvas.height, undefined, "FAST");
      pdf.save(`Relationships_Diagram_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }, [getSafeExportScale, renderCanvasFromSvg]);

  if (rows.length === 0) {
    return (
      <div className="rounded-theme border border-navy-700 bg-navy-900/40 px-4 py-12 text-center text-sm text-slate-400">
        No relationships to visualize for current filters.
      </div>
    );
  }

  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const selectedEdgeNodeIds = selectedEdge
    ? new Set([selectedEdge.source, selectedEdge.target])
    : new Set<string>();
  const activeNodeRelatedIds = activeNodeId
    ? new Set(
        edges.flatMap((edge) =>
          edge.source === activeNodeId || edge.target === activeNodeId
            ? [edge.source, edge.target]
            : []
        )
      )
    : new Set<string>();

  const miniWidth = 230;
  const miniHeight = 130;
  const miniScale = Math.min((miniWidth - 8) / canvasWidth, (miniHeight - 8) / canvasHeight);
  const miniOffsetX = (miniWidth - canvasWidth * miniScale) / 2;
  const miniOffsetY = (miniHeight - canvasHeight * miniScale) / 2;
  const wrapper = scrollRef.current;
  const viewport = wrapper
    ? {
        x: wrapper.scrollLeft / zoom,
        y: wrapper.scrollTop / zoom,
        w: wrapper.clientWidth / zoom,
        h: wrapper.clientHeight / zoom,
      }
    : null;

  return (
    <section className="min-h-0 min-w-0 overflow-hidden rounded-theme border border-navy-700 bg-navy-900/50">
      <div className="border-b border-navy-700 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-200">
            Relationship Diagram ({rows.length})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className="rounded-theme border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-navy-700"
            >
              -
            </button>
            <span className="min-w-14 text-center text-xs font-semibold text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="rounded-theme border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-navy-700"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="rounded-theme border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-navy-700"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleFit}
              className="rounded-theme border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-navy-700"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => void handleExportPng()}
              disabled={edges.length === 0 || exportingPng}
              className="rounded-theme border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-navy-700 disabled:opacity-50"
            >
              {exportingPng ? "Exporting..." : "Export PNG (Full)"}
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={edges.length === 0 || exportingPdf}
              className="rounded-theme border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-navy-700 disabled:opacity-50"
            >
              {exportingPdf ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0">
        <div
          ref={scrollRef}
          className="relative min-w-0 overflow-auto"
        >
          <div
            ref={diagramWrapRef}
            className="relative w-fit"
            onMouseLeave={() => setHoverTip(null)}
          >
          <svg
            ref={svgRef}
            width={Math.round(canvasWidth * zoom)}
            height={Math.round(canvasHeight * zoom)}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="block bg-navy-950/30"
          >
            <defs>
              <marker
                id="rel-arrow"
                markerWidth="10"
                markerHeight="8"
                refX="9"
                refY="4"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L10,4 L0,8 z" fill="currentColor" />
              </marker>
              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#facc15" floodOpacity="0.35" />
              </filter>
            </defs>

            {edges.map((edge) => {
              const selected = edge.id === selectedEdgeId;
              const emphasized = selected
                ? true
                : activeNodeId
                  ? edge.source === activeNodeId || edge.target === activeNodeId
                  : selectedEdge
                    ? edge.id === selectedEdge.id
                    : true;
              const dx = edge.targetPoint.x - edge.sourcePoint.x;
              const bend = Math.max(32, Math.abs(dx) * 0.32);
              const path = `M ${edge.sourcePoint.x} ${edge.sourcePoint.y} C ${edge.sourcePoint.x + bend} ${edge.sourcePoint.y}, ${edge.targetPoint.x - bend} ${edge.targetPoint.y}, ${edge.targetPoint.x} ${edge.targetPoint.y}`;
              return (
                <g key={edge.id}>
                  <path
                    d={path}
                    stroke={edge.color}
                    strokeOpacity={selected ? 0.98 : emphasized ? 0.76 : 0.18}
                    strokeWidth={selected ? 3.4 : emphasized ? 2.2 : 1.2}
                    markerEnd="url(#rel-arrow)"
                    fill="none"
                    style={{ color: edge.color }}
                    className="cursor-pointer"
                    onClick={() => setSelectedEdgeId(edge.id)}
                    onMouseEnter={(event) => {
                      const box = diagramWrapRef.current?.getBoundingClientRect();
                      setHoverTip({
                        x: (event.clientX - (box?.left ?? 0)) + 12,
                        y: (event.clientY - (box?.top ?? 0)) + 12,
                        text: `${edge.source}.${edge.sourceColumn} → ${edge.target}.${edge.targetColumn}`,
                      });
                    }}
                    onMouseMove={(event) => {
                      const box = diagramWrapRef.current?.getBoundingClientRect();
                      setHoverTip((prev) =>
                        prev
                          ? {
                              ...prev,
                              x: (event.clientX - (box?.left ?? 0)) + 12,
                              y: (event.clientY - (box?.top ?? 0)) + 12,
                            }
                          : prev
                      );
                    }}
                  />
                </g>
              );
            })}

            {nodes.map((node) => {
              const selected =
                selectedTable &&
                selectedTable !== allTablesValue &&
                node.id === selectedTable;
              const highlightedBySelectedEdge = selectedEdgeNodeIds.has(node.id);
              const highlightedByActiveNode = activeNodeId
                ? activeNodeRelatedIds.has(node.id)
                : false;
              const emphasized =
                selected || highlightedBySelectedEdge || highlightedByActiveNode || !activeNodeId;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x - NODE_WIDTH / 2},${node.y - NODE_HEIGHT / 2})`}
                  className="cursor-pointer"
                  onClick={() => {
                    setActiveNodeId((prev) => (prev === node.id ? null : node.id));
                    setSelectedEdgeId(null);
                  }}
                  onMouseEnter={(event) => {
                    const box = diagramWrapRef.current?.getBoundingClientRect();
                    setHoverTip({
                      x: (event.clientX - (box?.left ?? 0)) + 12,
                      y: (event.clientY - (box?.top ?? 0)) + 12,
                      text: `${node.id} • out ${node.outbound} • in ${node.inbound}`,
                    });
                  }}
                  onMouseMove={(event) => {
                    const box = diagramWrapRef.current?.getBoundingClientRect();
                    setHoverTip((prev) =>
                      prev
                        ? {
                            ...prev,
                            x: (event.clientX - (box?.left ?? 0)) + 12,
                            y: (event.clientY - (box?.top ?? 0)) + 12,
                          }
                        : prev
                    );
                  }}
                >
                  <rect
                    rx={10}
                    ry={10}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    fill={selected ? "#18283f" : highlightedByActiveNode ? "#102843" : "#13233a"}
                    stroke={selected ? "#facc15" : highlightedBySelectedEdge ? "#f59e0b" : "#334155"}
                    strokeWidth={selected || highlightedBySelectedEdge ? 2.2 : 1.2}
                    opacity={emphasized ? 1 : 0.35}
                    filter={selected || highlightedBySelectedEdge ? "url(#nodeGlow)" : undefined}
                  />
                  <text
                    x={14}
                    y={30}
                    fill="#e2e8f0"
                    fontSize="13"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    className="select-none"
                  >
                    {node.id}
                  </text>
                  <text x={14} y={54} fill="#93c5fd" fontSize="11" className="select-none">
                    out: {node.outbound}
                  </text>
                  <text x={84} y={54} fill="#7dd3fc" fontSize="11" className="select-none">
                    in: {node.inbound}
                  </text>
                </g>
              );
            })}
          </svg>
          {hoverTip && (
            <div
              className="pointer-events-none absolute z-20 rounded border border-navy-600 bg-navy-900/95 px-2 py-1 text-[11px] text-slate-200 shadow-lg"
              style={{
                left: Math.min(hoverTip.x, Math.round(canvasWidth * zoom) - 260),
                top: hoverTip.y,
              }}
            >
              {hoverTip.text}
            </div>
          )}
          </div>

          <div className="pointer-events-none absolute bottom-3 right-3 rounded border border-navy-700 bg-navy-900/85 p-1.5">
            <svg width={miniWidth} height={miniHeight} className="block">
              <rect x={0} y={0} width={miniWidth} height={miniHeight} fill="#0b1220" />
              {edges.map((edge) => (
                <line
                  key={`mini-${edge.id}`}
                  x1={miniOffsetX + edge.sourcePoint.x * miniScale}
                  y1={miniOffsetY + edge.sourcePoint.y * miniScale}
                  x2={miniOffsetX + edge.targetPoint.x * miniScale}
                  y2={miniOffsetY + edge.targetPoint.y * miniScale}
                  stroke="#64748b"
                  strokeWidth={0.8}
                  opacity={0.7}
                />
              ))}
              {nodes.map((node) => (
                <rect
                  key={`mini-node-${node.id}`}
                  x={miniOffsetX + (node.x - NODE_WIDTH / 2) * miniScale}
                  y={miniOffsetY + (node.y - NODE_HEIGHT / 2) * miniScale}
                  width={Math.max(2, NODE_WIDTH * miniScale)}
                  height={Math.max(2, NODE_HEIGHT * miniScale)}
                  fill="#1e3a5f"
                  stroke="#334155"
                  strokeWidth={0.7}
                />
              ))}
              {viewport && (
                <rect
                  x={miniOffsetX + viewport.x * miniScale}
                  y={miniOffsetY + viewport.y * miniScale}
                  width={Math.max(6, viewport.w * miniScale)}
                  height={Math.max(6, viewport.h * miniScale)}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth={1.2}
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
