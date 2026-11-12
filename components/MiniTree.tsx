import Link from "next/link";
import { layoutTree } from "@/lib/tree-layout";
import { truncate } from "@/lib/format";
import type { Line } from "@/lib/types";

const COL = 28;
const ROW = 40;
const PAD = 12;

/** The "Your path" sidebar: a small map of the story with the current path highlighted. */
export function MiniTree({
  lines,
  pathIds,
  currentId,
  slug,
}: {
  lines: Pick<Line, "id" | "parent_id" | "text">[];
  pathIds: Set<string>;
  currentId: string;
  slug: string;
}) {
  const { nodes, edges, columns, levels } = layoutTree(lines);
  const width = (columns - 1) * COL + PAD * 2;
  const height = (levels - 1) * ROW + PAD * 2;
  const at = new Map(nodes.map((n) => [n.id, { x: n.x * COL + PAD, y: n.y * ROW + PAD }]));

  return (
    <svg
      viewBox={`0 0 ${Math.max(width, 60)} ${Math.max(height, 40)}`}
      className="max-h-[140px] w-full desk:max-h-[260px]"
      role="img"
      aria-label="Map of the story with your path highlighted"
    >
      {edges.map((e) => {
        const a = at.get(e.from)!;
        const b = at.get(e.to)!;
        const active = pathIds.has(e.from) && pathIds.has(e.to);
        const len = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
        return (
          <line
            key={e.to}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={active ? "#9A6A0C" : "#D9CBA0"}
            strokeWidth={active ? 2.5 : 1.5}
            strokeLinecap="round"
            style={
              active
                ? ({ strokeDasharray: len, "--len": len, animation: "sb-draw 600ms var(--ease-out) both" } as React.CSSProperties)
                : { animation: "sb-fade 400ms var(--ease-out) both" }
            }
          />
        );
      })}
      {nodes.map((n) => {
        const p = at.get(n.id)!;
        const isCurrent = n.id === currentId;
        const onPath = pathIds.has(n.id);
        return (
          <Link key={n.id} href={`/s/${slug}/${n.id}`} aria-label={truncate(n.text, 60)} className="group">
            <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
            {isCurrent && (
              <circle
                cx={p.x}
                cy={p.y}
                r={7}
                fill="none"
                stroke="#D9A441"
                strokeWidth={2}
                style={{ transformOrigin: `${p.x}px ${p.y}px`, animation: "sb-ring 1.6s var(--ease-out) 450ms 2 both" }}
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isCurrent ? 7 : 5}
              fill={isCurrent ? "#9A6A0C" : onPath ? "#D9A441" : "#D9CBA0"}
              stroke={isCurrent ? "#7C5808" : "none"}
              strokeWidth={2}
              className="transition-[r] duration-200 group-hover:[r:7px]"
            />
          </Link>
        );
      })}
    </svg>
  );
}
