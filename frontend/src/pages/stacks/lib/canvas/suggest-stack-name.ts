/**
 * The name a brand-new stack opens with.
 *
 * **A stack does not need to be named before it can be drawn.** The canvas
 * used to open with an empty field in the header and a red `Required` waiting
 * behind Deploy — so the first thing the product asked for was the one decision
 * the user had least information to make, before a single resource existed to
 * name. The name is renamed in the trail like every other object's (§12a), and
 * a rename is a thing you do when you know the answer.
 *
 * `new-stack`, then `new-stack-2`, `new-stack-3` — the numbering starts at 2
 * because the first one is not "the first of several" until there is a second.
 * Taken names are skipped rather than collided with: the API refuses a
 * duplicate, and a suggestion that is refused the moment you press Deploy is
 * worse than no suggestion at all.
 */
const BASE = "new-stack";

export function suggestStackName(taken: readonly { name?: string }[]): string {
  const names = new Set(taken.map((s) => s.name).filter((n): n is string => !!n));
  if (!names.has(BASE)) return BASE;
  for (let n = 2; ; n++) {
    const candidate = `${BASE}-${n}`;
    if (!names.has(candidate)) return candidate;
  }
}
