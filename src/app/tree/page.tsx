"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buildGoalTree, type TreeNode } from "@/lib/goal-tree-utils";
import { getHorizonColor } from "@/lib/constants";
import { useLocale } from "@/providers/locale-provider";
import { Loader2, Home, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import Link from "next/link";

// ── Layout constants (top-down) ──
const NODE_W = 200;
const NODE_H = 68;
const H_GAP = 28;  // horizontal gap between siblings
const V_GAP = 56;  // vertical gap between levels

// ── Position each node ──
interface PositionedNode {
  id: string;
  node: TreeNode;
  x: number;
  y: number;
  parentId?: string;
}

function layoutTree(roots: TreeNode[]): { nodes: PositionedNode[]; width: number; height: number } {
  const positioned: PositionedNode[] = [];
  let nextX = 0;

  // Top-down: depth controls Y, leaf siblings spread along X
  function place(node: TreeNode, depth: number, parentId?: string): { minX: number; maxX: number } {
    const id = String(node.goal.id);
    const y = depth * (NODE_H + V_GAP);

    if (node.children.length === 0) {
      const x = nextX;
      nextX += NODE_W + H_GAP;
      positioned.push({ id, node, x, y, parentId });
      return { minX: x, maxX: x };
    }

    const childBounds = node.children.map((child) => place(child, depth + 1, id));
    const firstX = childBounds[0].minX;
    const lastX = childBounds[childBounds.length - 1].maxX;
    const x = (firstX + lastX) / 2;

    positioned.push({ id, node, x, y, parentId });
    return { minX: firstX, maxX: lastX };
  }

  for (const root of roots) {
    place(root, 0);
  }

  const width = Math.max(...positioned.map((p) => p.x + NODE_W), 0) + 80;
  const height = Math.max(...positioned.map((p) => p.y + NODE_H), 0) + 80;
  return { nodes: positioned, width, height };
}

// ── SVG Node Card ──
function NodeCard({
  pos,
  selected,
  onSelect,
  t,
}: {
  pos: PositionedNode;
  selected: boolean;
  onSelect: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const color = getHorizonColor(pos.node.goal.horizonKey);
  const taskCount = pos.node.tasks.length;
  const title = pos.node.goal.title;

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} onClick={onSelect} className="cursor-pointer">
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={12}
        fill="white"
        stroke={selected ? color : "#e5e7eb"}
        strokeWidth={selected ? 2.5 : 1}
        filter="url(#nodeShadow)"
      />
      <rect x={0} y={0} width={4} height={NODE_H} rx={2} fill={color} />
      <text x={16} y={20} fontSize={10} fill="#9ca3af" fontFamily="inherit">
        {t(`horizon.${pos.node.goal.horizonKey}`)}
      </text>
      <text x={16} y={40} fontSize={13} fontWeight={600} fill="#1f2937" fontFamily="inherit">
        {title.length > 22 ? title.slice(0, 20) + "\u2026" : title}
      </text>
      {taskCount > 0 && (
        <text x={16} y={58} fontSize={10} fill="#9ca3af" fontFamily="inherit">
          {t("tree.tasks", { n: taskCount })}
        </text>
      )}
    </g>
  );
}

// ── Bezier connection (top-down) ──
function Connection({ from, to }: { from: PositionedNode; to: PositionedNode }) {
  const sx = from.x + NODE_W / 2;
  const sy = from.y + NODE_H;
  const ex = to.x + NODE_W / 2;
  const ey = to.y;
  const my = (sy + ey) / 2;

  return (
    <path
      d={`M ${sx} ${sy} C ${sx} ${my}, ${ex} ${my}, ${ex} ${ey}`}
      fill="none"
      stroke="#d1d5db"
      strokeWidth={1.5}
    />
  );
}

// ── Detail sidebar ──
function DetailPanel({ node, onClose, t }: {
  node: TreeNode;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const color = getHorizonColor(node.goal.horizonKey);

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-30">
      <div className="p-5">
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 mb-4">
          {t("common.back")}
        </button>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs text-gray-400">{t(`horizon.${node.goal.horizonKey}`)}</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{node.goal.title}</h2>
        {node.goal.description && (
          <p className="text-sm text-gray-500 mb-4">{node.goal.description}</p>
        )}
        {node.tasks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("tree.tasks", { n: node.tasks.length })}
            </h3>
            <div className="space-y-1.5">
              {node.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${task.status === "completed" ? "bg-green-400" : "bg-gray-300"}`} />
                  <span className="text-sm text-gray-700 truncate">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {node.children.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {node.children.length} sub-goals
            </h3>
            <div className="space-y-1">
              {node.children.map((child) => (
                <div key={child.goal.id} className="flex items-center gap-2 px-2 py-1.5">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: getHorizonColor(child.goal.horizonKey) }} />
                  <span className="text-sm text-gray-600">{child.goal.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main tree page ──
export default function TreePage() {
  const { t } = useLocale();
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const tree = useMemo(() => {
    if (!goals || !tasks) return null;
    return buildGoalTree(goals, tasks);
  }, [goals, tasks]);

  const { nodes, posMap } = useMemo(() => {
    if (!tree || tree.length === 0) return { nodes: null, posMap: new Map<string, PositionedNode>() };
    const result = layoutTree(tree);
    const map = new Map<string, PositionedNode>();
    for (const n of result.nodes) map.set(n.id, n);
    return { nodes: result, posMap: map };
  }, [tree]);

  const selectedNode = selectedId ? posMap.get(selectedId)?.node ?? null : null;

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.max(0.2, Math.min(2.5, z - e.deltaY * 0.001)));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const fitToScreen = useCallback(() => {
    if (!nodes || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const availW = rect.width - (selectedNode ? 320 : 0) - 80;
    const availH = rect.height - 80;
    const scaleX = availW / nodes.width;
    const scaleY = availH / nodes.height;
    setZoom(Math.min(scaleX, scaleY, 1.5));
    setPan({ x: 40, y: 40 });
  }, [nodes, selectedNode]);

  // Loading
  if (!goals || !tasks) {
    return (
      <div className="h-dvh flex items-center justify-center bg-neutral-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Empty
  if (!tree || tree.length === 0 || !nodes) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-neutral-50">
        <p className="text-gray-400">{t("tree.noGoals")}</p>
        <Link href="/" className="text-sm text-blue-500 hover:underline">{t("common.back")}</Link>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-neutral-50" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <Home className="h-4 w-4 text-gray-500" />
          </Link>
          <h1 className="text-sm font-bold text-gray-900">
            Life Builder <span className="font-normal text-gray-400">— Goal Tree</span>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ZoomIn className="h-4 w-4 text-gray-500" />
          </button>
          <span className="text-xs text-gray-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ZoomOut className="h-4 w-4 text-gray-500" />
          </button>
          <button onClick={fitToScreen} className="p-1.5 rounded-lg hover:bg-gray-100 ml-1">
            <Maximize2 className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <filter id="nodeShadow" x="-4%" y="-4%" width="108%" height="116%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.06" />
            </filter>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Lines */}
            {nodes.nodes.map((pos) => {
              if (!pos.parentId) return null;
              const parent = posMap.get(pos.parentId);
              if (!parent) return null;
              return <Connection key={`edge-${pos.id}`} from={parent} to={pos} />;
            })}
            {/* Nodes */}
            {nodes.nodes.map((pos) => (
              <NodeCard
                key={pos.id}
                pos={pos}
                selected={pos.id === selectedId}
                onSelect={() => setSelectedId(pos.id === selectedId ? null : pos.id)}
                t={t}
              />
            ))}
          </g>
        </svg>

        {/* Detail sidebar */}
        {selectedNode && (
          <DetailPanel node={selectedNode} onClose={() => setSelectedId(null)} t={t} />
        )}
      </div>
    </div>
  );
}
