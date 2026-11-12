/* eslint-disable @next/next/no-img-element */
export function Avatar({ url, handle, size = 30 }: { url?: string | null; handle?: string; size?: number }) {
  const style = { width: size, height: size };
  if (url) {
    return <img src={url} alt="" style={style} className="animate-fade flex-none rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className="flex flex-none items-center justify-center rounded-full bg-line font-serif font-semibold text-ink/70"
    >
      {handle?.[0]?.toUpperCase() ?? ""}
    </span>
  );
}
