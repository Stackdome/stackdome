import type { ReactNode } from "react"
import { Boxes, Globe, HardDrive, Package } from "lucide-react"

import { BrandIcon } from "@/components/branded/brand-icons"

/**
 * The blank canvas **explains itself instead of jumping there.**
 *
 * Every other starting point shows you what you are about to get before you
 * commit to it. Sending this one straight to an empty canvas would be the only
 * option in the strip that answers a different question — so it lists what an
 * empty canvas actually gives you, and `Create stack` still does the leaving.
 *
 * **Each group names its examples.** The three headings alone were abstract —
 * "Data stores" tells you a category, `Postgres · MySQL · Redis` tells you
 * whether the thing you came for is in there. The examples are chips rather
 * than prose because they are a set you scan, not a sentence you read.
 */
type Example = { label: string; icon?: ReactNode; mono?: boolean }

const WHAT_YOU_GET: {
  icon: ReactNode
  title: string
  description: string
  examples: Example[]
}[] = [
  {
    icon: <Globe />,
    title: "Services",
    description: "Your own image, or any public one. Give it a port and a URL.",
    examples: [
      { label: "Web service", icon: <Globe /> },
      { label: "Custom", icon: <Package /> },
    ],
  },
  {
    icon: <Boxes />,
    title: "Data stores",
    description: "Postgres, MySQL, Redis and the rest, wired to your services.",
    examples: [
      { label: "Postgres", icon: <BrandIcon slug="postgres" size={16} /> },
      { label: "MySQL", icon: <BrandIcon slug="mysql" size={16} /> },
      { label: "MongoDB", icon: <BrandIcon slug="mongo" size={16} /> },
      { label: "Redis", icon: <BrandIcon slug="redis" size={16} /> },
      { label: "Elasticsearch", icon: <BrandIcon slug="elasticsearch" size={16} /> },
    ],
  },
  {
    icon: <HardDrive />,
    title: "Volumes",
    description: "Disk that survives a redeploy.",
    // A mount path is a machine value, so it is mono and carries no glyph —
    // the string IS the illustration (§6).
    examples: [{ label: "pgdata:/var/lib/postgresql/data", mono: true }],
  },
]

export function BlankTab() {
  return (
    // 32 between groups: these are three different KINDS of thing, so they take
    // the band rung rather than the list one (§8).
    <div className="flex flex-col gap-8">
      {WHAT_YOU_GET.map((thing) => (
        <div key={thing.title} className="flex items-start gap-[11px]">
          <span className="border-border bg-control text-fg-2 flex size-[30px] flex-none items-center justify-center rounded-md border [&_svg]:size-4">
            {thing.icon}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body text-foreground font-medium">{thing.title}</span>
            <span className="text-meta text-fg-muted">{thing.description}</span>
            <span className="flex flex-wrap gap-1.5 pt-2">
              {thing.examples.map((example) => (
                <span
                  key={example.label}
                  className={cnChip(example)}
                >
                  {example.icon && (
                    <span className="flex size-4 flex-none items-center justify-center [&_svg]:size-4">
                      {example.icon}
                    </span>
                  )}
                  <span className={example.mono ? "font-mono" : undefined}>{example.label}</span>
                </span>
              ))}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * 28px, `rounded-sm` — radius follows height (§8), and a chip this size takes
 * the 6px rung, not the control default.
 *
 * The inset is asymmetric on purpose: a glyph carries its own margin, so a
 * chip with one sits on 8 and a chip without one sits on 10, and both read as
 * the same distance (§8's perceived-space rule).
 */
function cnChip(example: Example) {
  return [
    "border-border bg-control text-fg-2 text-meta",
    "flex h-7 flex-none items-center gap-1.5 rounded-sm border pr-2.5",
    example.icon ? "pl-2" : "pl-2.5",
  ].join(" ")
}
