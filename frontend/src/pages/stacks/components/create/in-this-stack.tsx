import type { ReactNode } from "react"

import { PickerRow, PickerRowRemove } from "@/components/branded"

/** One thing the chosen starting point puts on the canvas. */
export interface StackItem {
  key: string
  /** The resource's own name — machine-set, so the row sets it in mono (§6). */
  name: string
  /** What it is, in words: "service", "linked add-on", "from a public URL". */
  sub: string
  icon: ReactNode
  /** Present only where the user can take this one instance back out. */
  onRemove?: () => void
}

/**
 * The stack so far — the old wizard's one genuinely good panel, kept.
 *
 * **240, and only for what you have got** (§13). It was 300 on the page this
 * flow used to be, where the body could afford it. In the drawer the rung is
 * fixed by arithmetic, not taste: `20 + 296 + 20 + 240 + 20 = 596` is the floor
 * for two columns, and 640 is the rung above it. Take the rail wider and the
 * left column drops under the width its own search field needs.
 *
 * **It stays on screen with nothing in it.** On the page it appeared with the
 * first selection and not before, because an empty panel reserving 300px to
 * show nothing was that layout's bug. In a fixed 640 the opposite is true: a
 * column that appears on the first pick makes the list jump sideways at the
 * exact moment you are reading it. So the rail is always there and **says what
 * it is waiting for** — which is also the honest thing to do (§9: say what is
 * missing, do not leave the user to infer it).
 *
 * The rows are the dense 40px rung of the same picker row the catalogue uses —
 * the same object, made dense, not a second component.
 */
export function InThisStack({
  items,
  /** What the rail is waiting for, in the verb of this starting point. */
  waitingFor = "Nothing yet. Pick a starting point and what it creates shows here.",
}: {
  items: StackItem[]
  waitingFor?: string
}) {
  return (
    <aside className="border-border-subtle sticky top-0 w-60 flex-none self-start border-l pl-5">
      <div className="text-label text-fg-muted px-2 pt-0.5 pb-2">In this stack · {items.length}</div>

      {items.length === 0 ? (
        <p className="text-label text-fg-muted px-2 leading-4">{waitingFor}</p>
      ) : (
        <>
          <div className="flex flex-col gap-0.5">
            {items.map((item) => (
              <PickerRow
                key={item.key}
                size={40}
                icon={item.icon}
                name={item.name}
                meta={[{ text: item.sub }]}
                trailing={
                  item.onRemove && (
                    <PickerRowRemove label={`Remove ${item.name}`} onRemove={item.onRemove} />
                  )
                }
              />
            ))}
          </div>
          {/* Only once there is something to configure. Over an empty rail it
              promised the user could rename and connect nothing at all. */}
          <p className="text-label text-fg-muted px-2 pt-2 leading-4">
            You can rename, connect and configure all of this on the canvas.
          </p>
        </>
      )}
    </aside>
  )
}
