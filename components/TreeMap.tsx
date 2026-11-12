"use client";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { layoutTree } from "@/lib/tree-layout";
import { truncate } from "@/lib/format";

export type TreeLine = {
  id: string;
  parent_id: string | null;
  text: string;
  up: number;
  down: number;
  children: number;
  depth: number;
  is_complete: boolean;
  author: string;
};

type LineNodeData = TreeLine & { state: "current" | "path" | "other"; truncated: boolean; slug: string };

const COL = 210;
const ROW = 120;

function LineNode({ data }: NodeProps<Node<LineNodeData>>) {
  const styles = {
    current: "border-gold bg-cream ring-2 ring-gold",
    path: "border-gold-soft bg-[#FBF3E0]",
    other: "border-black/10 bg-white",
  }[data.state];
  return (
    <div className={`lift w-[180px] cursor-pointer rounded-[3px] border px-3 py-2 text-left shadow-sm ${styles}`}>
      <Handle type="target" position={Position.Top} className="!h-1 !w-1 !border-0 !bg-transparent" />
      <p className="font-serif text-[12.5px] leading-snug text-ink">{truncate(data.text, 80)}</p>
      <p className="mt-1 text-[10px] font-medium text-faint">
        @{data.author} · {data.up - data.down} votes
        {data.is_complete && " · ending"}
        {data.truncated && ` · +${data.children} more`}
      </p>
      <Handle type="source" position={Position.Bottom} className="!h-1 !w-1 !border-0 !bg-transparent" />
    </div>
  );
}

const nodeTypes = { line: LineNode };

/** React Flow tree map: pan, zoom and click-to-jump. */
export function TreeMap({
  slug,
  lines,
  pathIds,
  currentId,
  startDepth,
}: {
  slug: string;
  lines: TreeLine[];
  pathIds: string[];
  currentId: string;
  startDepth: number;
}) {
  const router = useRouter();

  const { nodes, edges } = useMemo(() => {
    const onPath = new Set(pathIds);
    const present = new Set(lines.map((l) => l.id));
    const laid = layoutTree(lines);
    const nodes: Node<LineNodeData>[] = laid.nodes.map((n) => {
      const shownKids = lines.filter((l) => l.parent_id === n.id).length;
      return {
        id: n.id,
        type: "line",
        position: { x: n.x * COL, y: n.y * ROW },
        data: {
          ...n,
          slug,
          state: n.id === currentId ? "current" : onPath.has(n.id) ? "path" : "other",
          truncated: n.children > shownKids && n.depth - startDepth >= 6,
        },
        draggable: false,
        connectable: false,
      };
    });
    const edges: Edge[] = laid.edges
      .filter((e) => present.has(e.from))
      .map((e) => {
        const active = onPath.has(e.from) && onPath.has(e.to);
        return {
          id: `${e.from}-${e.to}`,
          source: e.from,
          target: e.to,
          type: "smoothstep",
          style: { stroke: active ? "#9A6A0C" : "#D9CBA0", strokeWidth: active ? 2.5 : 1.5 },
        };
      });
    return { nodes, edges };
  }, [lines, pathIds, currentId, slug, startDepth]);

  return (
    <div className="card h-[70vh] min-h-[420px] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1, duration: 500 }}
        minZoom={0.15}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: false }}
        onNodeClick={(_, node) => {
          const d = node.data as LineNodeData;
          router.push(d.truncated ? `/s/${slug}/tree?at=${currentId}&from=${node.id}` : `/s/${slug}/${node.id}`);
        }}
      >
        <Background color="#E8DFCB" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
