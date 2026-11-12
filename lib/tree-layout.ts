import type { Line } from "@/lib/types";

export type LaidOutNode<T extends Pick<Line, "id" | "parent_id">> = T & { x: number; y: number };

/**
 * Simple tidy tree layout: leaves get consecutive columns, parents sit centred
 * above their children. Children keep the order given (best score first).
 * Returns positions in "column" and "level" units; callers scale them.
 */
export function layoutTree<T extends Pick<Line, "id" | "parent_id">>(lines: T[]) {
  const ids = new Set(lines.map((l) => l.id));
  const children = new Map<string, T[]>();
  const roots: T[] = [];
  for (const l of lines) {
    if (l.parent_id && ids.has(l.parent_id)) {
      const list = children.get(l.parent_id) ?? [];
      list.push(l);
      children.set(l.parent_id, list);
    } else {
      roots.push(l);
    }
  }

  const pos = new Map<string, { x: number; y: number }>();
  let nextColumn = 0;
  const place = (node: T, level: number): number => {
    const kids = children.get(node.id) ?? [];
    let x: number;
    if (kids.length === 0) {
      x = nextColumn++;
    } else {
      const xs = kids.map((k) => place(k, level + 1));
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    pos.set(node.id, { x, y: level });
    return x;
  };
  roots.forEach((r) => place(r, 0));

  const nodes = lines.filter((l) => pos.has(l.id)).map((l) => ({ ...l, ...pos.get(l.id)! }));
  const edges = nodes
    .filter((n) => n.parent_id && pos.has(n.parent_id))
    .map((n) => ({ from: n.parent_id as string, to: n.id }));
  const columns = Math.max(nextColumn, 1);
  const levels = Math.max(0, ...nodes.map((n) => n.y)) + 1;
  return { nodes, edges, columns, levels };
}
