import { LINE_MAX } from "@/lib/schemas";

export function CharCounter({ length, id }: { length: number; id: string }) {
  const left = LINE_MAX - length;
  const color = left < 0 ? "text-red-800" : left <= 20 ? "text-gold" : "text-faint";
  return (
    <span id={id} className={`text-xs font-medium transition-colors duration-200 ${color}`} aria-live="polite">
      {left < 0 ? `${-left} over the limit` : `${left} characters left`}
    </span>
  );
}
