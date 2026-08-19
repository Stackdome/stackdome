import { Boxes, FileCode, GitBranch, Package, SquareDashed } from "lucide-react";
import { createElement, type ReactNode } from "react";

import { templates } from "@/pages/stacks/data/templates/registry";

/**
 * One of the five places a stack can start from.
 *
 * The type used to live in `starting-point-tabs.tsx`, beside the tab strip that
 * rendered it. The strip is gone — start-from is step one of a drawer now — and
 * the shape belongs with the data rather than with whichever component draws
 * it this month.
 */
export interface StartingPoint<T extends string> {
  value: T;
  /**
   * **The row on step one** — "From a repository". It carries its own stem
   * because nothing above it does any more; see the note on the list below.
   */
  name: string;
  /**
   * **The crumb once you are inside it** — "Select repository". A verb, because
   * by then the row has answered *which kind* and the step has to say what you
   * are doing.
   *
   * It is a field rather than a transform of `name`: the five verbs are not the
   * same word. You SELECT a repository or an app, you ADD a compose file or
   * blocks, and you START blank. Deriving one from the other would mean picking
   * a verb that is wrong for four of them.
   */
  step: string;
  /** The specifics: which provider, which apps, which parts. Never a second title. */
  description: string;
  icon: ReactNode;
  /**
   * The odd one out, and it says so: a dashed glyph reports "nothing in it
   * yet", which is a fact rather than decoration.
   */
  dashed?: boolean;
}

/**
 * The five peers. **They are peers** — none is a default dressed as a
 * recommendation, and the order runs from "your own code" outwards to "nothing
 * at all", which is also roughly how often each is used.
 */
export type Source = "git" | "template" | "compose" | "blocks" | "blank";

/**
 * "n8n, Grafana, Immich and 4 more" — **named, then counted.**
 *
 * The names are chosen, not sliced off the front of the registry: the line's
 * job is to be recognised, and registry order is insertion order. The count is
 * derived from the real total, so the sentence cannot go stale as the registry
 * grows — only the three names are a copy decision.
 */
function namedThenCounted(shown: string[], total: number) {
  const rest = total - shown.length;
  const head = shown.join(", ");
  return rest > 0 ? `${head} and ${rest} more` : head;
}

/**
 * **Each row carries its own stem now: "From a repository", not "A repository".**
 *
 * The bare nouns were half of a pair. A `Start from` eyebrow sat above the tab
 * strip, and with a stem over them the nouns read as one sentence per tab —
 * "Start from… a repository" — which scanned faster than five imperative
 * clauses. The comment here said the eyebrow and the nouns were ONE decision
 * and that removing one without the other would leave sentence fragments.
 *
 * Then the strip became a drawer step, and the eyebrow went with it. The nouns
 * were left doing exactly what that warning predicted: `A repository` standing
 * alone in a list, a fragment with nothing to complete it.
 *
 * `From` is the stem, moved into the row. It costs one word and it means the
 * step reads without anything above it — which is the state a drawer step is
 * actually in.
 */
export const STARTING_POINTS: StartingPoint<Source>[] = [
  {
    value: "git",
    name: "From a repository",
    step: "Select repository",
    description: "Deploy your own code",
    icon: createElement(GitBranch),
  },
  {
    value: "template",
    name: "From a ready-made app",
    step: "Select app",
    description: namedThenCounted(["n8n", "Grafana", "Immich"], templates.length),
    icon: createElement(Package),
  },
  {
    value: "compose",
    name: "From a compose file",
    step: "Add compose file",
    description: "Import a definition you have",
    icon: createElement(FileCode),
  },
  {
    value: "blocks",
    name: "From building blocks",
    step: "Add blocks",
    description: "Assemble it from parts",
    icon: createElement(Boxes),
  },
  {
    value: "blank",
    name: "From a blank canvas",
    step: "Start blank",
    description: "Start with nothing",
    icon: createElement(SquareDashed),
    // The odd one out, and it says so: a dashed chip reports "nothing in it
    // yet", which is a fact rather than decoration.
    dashed: true,
  },
];

/**
 * The sentence under the strip. It says what the chosen starting point actually
 * does, because the tab's own line cannot carry it — and because §1's user
 * should not need documentation open beside the product.
 */
export const SOURCE_LEDE: Record<Source, string> = {
  git: "Stackdome builds the image from a branch and gives the service a URL.",
  template: "A known app, already wired. You can change anything afterwards.",
  compose: "Paste or drop a docker-compose file. We read the services out of it.",
  blocks: "Pick the parts. Known software lands already configured.",
  blank:
    "You start with an empty canvas and add everything yourself. Nothing is created until you press Create stack.",
};
