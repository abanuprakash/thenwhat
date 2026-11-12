"use client";
import { useEffect, useState } from "react";

/**
 * Two invisible spam filters for forms: a "website" field people never see (bots fill it in)
 * and the time the form appeared (instant submissions are bots). Checked in the Server Action.
 */
export function BotFields() {
  const [shownAt, setShownAt] = useState("");
  useEffect(() => setShownAt(String(Date.now())), []);
  return (
    <>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="_t" value={shownAt} />
    </>
  );
}
