"use client";
import { useEffect, useRef } from "react";

/**
 * Two invisible spam filters for forms: a "website" field people never see (bots fill it in)
 * and the time the form appeared (instant submissions are bots). Checked in the Server Action.
 */
export function BotFields() {
  // Stamped once the form is on screen. Set as the default value too, so it survives React
  // resetting the form after an action.
  const shownAt = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = shownAt.current;
    if (el) el.defaultValue = el.value = String(Date.now());
  }, []);
  return (
    <>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input ref={shownAt} type="hidden" name="_t" defaultValue="" />
    </>
  );
}
