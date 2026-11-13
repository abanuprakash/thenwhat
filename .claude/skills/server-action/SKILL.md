---
name: server-action
description: Write or change a Server Action (any form submission or button that changes data) in Then What, with validation, plan checks, rate limits and safe errors.
---

# Writing a Server Action

All writes go through Server Actions. Reader and author actions live in `app/actions.ts`, sign-in and profile in `app/account-actions.ts`, and dashboard ones in `app/dashboard-actions.ts`. These files are `"use server"`, so export only async functions. Types and helpers live in `lib/action-utils.ts`.

## Template

```ts
export async function doThing(_: FormState, formData: FormData): Promise<FormState> {
  // 1. Validate. Zod schema in lib/schemas.ts; text fields go through cleanText via the `text()` helper.
  const parsed = doThingSchema.safeParse({ id: formData.get("id"), text: formData.get("text") });
  if (!parsed.success) return fieldErrors(parsed.error);

  // 2. Who's asking (redirects to /login if signed out).
  const viewer = await requireViewer(`/somewhere/${parsed.data.id}`);

  // 3. Bots: only on forms a stranger can submit (render <BotFields /> in the form).
  if (looksLikeBot(formData)) return { error: "Please try again." };

  // 4. Plan.
  if (!hasFeature(await getEntitlements(), "the_feature")) return { error: PLAN_MESSAGE };

  // 5. Rate limit. Add an entry to LIMITS in lib/security.ts if none fits.
  if (!(await limit("thingPerUser", viewer.id))) return { error: TOO_MANY };

  // 6. Database: RPC to a security-definer function, or a table write protected by RLS.
  const supabase = await createClient();
  const { error } = await supabase.rpc("do_thing", { p_id: parsed.data.id, p_text: parsed.data.text });
  if (error) return { error: friendly(error) };

  // 7. Refresh what changed.
  revalidatePath("/somewhere", "layout");
  return { ok: "Done. Short and human." };
}
```

## Rules

- **Never trust the client:** ids, prices, roles, counts and author ids come from the session or the database, never the form.
- **Plain function arguments** (e.g. `vote(lineId, value)`) still get validated: `uuid.safeParse(id)` at the top.
- **Errors go through `friendly()`.** It hides database internals and passes through our own SQL messages.
- **`redirect()` throws,** so call it outside `try` blocks, after the work is done.
- **Client side:** `useActionState<FormState, FormData>(action, {})`, a disabled button while `pending`, `role="alert"` for errors and `role="status"` for `ok`.
- **Route Handlers that change state** (rare) must check `await sameOrigin(request)`, and use POST.
