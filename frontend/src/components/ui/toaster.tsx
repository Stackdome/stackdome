import { CheckCircle2, CircleAlert, Info, TriangleAlert } from "lucide-react"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import type { ToastProps } from "@/components/ui/toast"

/**
 * **The tone is carried by the glyph and nothing else** (§13, board `427:5102`).
 * The surface stays white and the hairline stays neutral on all five, so the
 * severity is said exactly once (§11).
 */
function toneGlyph(variant: ToastProps["variant"]) {
  switch (variant) {
    case "destructive":
      return { Glyph: CircleAlert, ink: "text-danger" }
    case "success":
      return { Glyph: CheckCircle2, ink: "text-success" }
    case "warning":
      return { Glyph: TriangleAlert, ink: "text-warn" }
    case "info":
      return { Glyph: Info, ink: "text-info" }
    default:
      return { Glyph: Info, ink: "text-fg-2" }
  }
}

/**
 * What goes between the two when both are present.
 *
 * The board's toast is one paragraph — *"Could not reach the cluster. The
 * deploy was not started."* — but a title in this codebase is written as a
 * **fragment**: `Addon created`, `Registry removed`. Ninety-seven call sites
 * wrote them for a bold heading over a caption, where no stop was needed.
 * Joined into a sentence they need one, and adding it here is one place rather
 * than ninety-seven rewrites of copy that is otherwise correct.
 *
 * Only a string can be inspected; anything else gets a plain space.
 */
function joiner(title: React.ReactNode): string {
  if (typeof title !== "string") return " "
  return /[.!?:;]$/.test(title.trim()) ? " " : ". "
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    // Right, because the viewport is in the right-hand corner — a toast leaves
    // the way it came in.
    <ToastProvider swipeDirection="right">
      {[...toasts].reverse().map(({ id, title, description, action, variant, ...props }) => {
        const { Glyph, ink } = toneGlyph(variant)
        return (
          <Toast key={id} {...props}>
            {/* 16px glyph nudged 2px down, so it centres on the FIRST line of a
                20px line box rather than on the box that contains it (§8). The
                same nudge the inline alert already ships. */}
            <Glyph aria-hidden className={`mt-0.5 size-4 shrink-0 ${ink}`} />
            {/* **One paragraph, one tier.** The board draws every tone as a
                single run of `body/400`, including the two-sentence ones — so
                the title and the description flow together rather than sitting
                as a bold heading over a dimmed caption. */}
            <p className="min-w-0 flex-1 [word-break:break-word]">
              {title && <ToastTitle>{title}</ToastTitle>}
              {title && description ? joiner(title) : null}
              {description && <ToastDescription>{description}</ToastDescription>}
            </p>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
