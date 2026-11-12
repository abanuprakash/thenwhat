import type { Capacity } from "@/lib/types";

/** Plain-language view of what a line allows, shared by the reading page and composer. */
export function describeCapacity(c: Capacity | null) {
  if (!c) return null;
  const branchFull = c.branch_limit !== null && c.children >= c.branch_limit;
  const lineNumber = c.depth + 1; // the opening line is line 1
  const atMaxDepth = c.max_depth !== null && lineNumber >= c.max_depth;
  const inactive = c.story_status !== "active";
  return {
    ...c,
    lineNumber,
    branchFull,
    atMaxDepth,
    inactive,
    canContinue: !inactive && !c.is_complete && !branchFull && !atMaxDepth,
    /** The next line written here would be the last allowed on this path. */
    nextIsFinal: c.max_depth !== null && lineNumber + 1 === c.max_depth,
    branchesLeft: c.branch_limit === null ? null : Math.max(c.branch_limit - c.children, 0),
  };
}

export type CapacityView = NonNullable<ReturnType<typeof describeCapacity>>;
