import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "[outline-width:1px] [outline-style:solid] [outline-color:var(--border)] placeholder:text-fg-muted aria-invalid:[outline-color:var(--danger)] bg-card shadow-sm flex field-sizing-content min-h-16 w-full rounded-md px-3 py-2 text-body font-normal transition-[color,box-shadow,border-color] hover:[outline-color:var(--border-strong)] disabled:hover:[outline-color:var(--border)] disabled:cursor-not-allowed disabled:opacity-50",
        "focus-ring-edge",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
