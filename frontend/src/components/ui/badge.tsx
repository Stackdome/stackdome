import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full outline outline-1 px-2 py-0.5 text-meta font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-ring-edge aria-invalid:outline-danger transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "outline-transparent bg-foreground/5 text-fg-2 [a&]:hover:bg-foreground/10",
        secondary: "outline-border-subtle bg-transparent text-fg-2 [a&]:hover:bg-foreground/5",
        destructive:
          "outline-transparent bg-danger-bg text-danger [a&]:hover:bg-danger-bg/70",
        outline: "outline-border-subtle text-foreground bg-transparent [a&]:hover:bg-foreground/5",
        success: "outline-transparent bg-success-bg text-success",
        warning: "outline-transparent bg-warn-bg text-warn",
        info: "outline-transparent bg-info-bg text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
