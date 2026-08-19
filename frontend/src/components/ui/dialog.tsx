"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-scrim",
        className
      )}
      {...props}
    />
  )
}

// Three widths, not thirteen. A raw `sm:max-w-*` at a call site is exactly how
// thirteen happened — pick a rung instead.
//   ask  440 — a question and its two answers
//   form 560 — fields to fill in
//   work 760 — something to read or compare
// Anything that will not fit 760 is not a dialog (§13) — reach for a drawer.
const dialogSizes = {
  ask: "sm:max-w-[440px]",
  form: "sm:max-w-[560px]",
  work: "sm:max-w-[760px]",
} as const

type DialogSize = keyof typeof dialogSizes

function DialogContent({
  className,
  children,
  size = "form",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: DialogSize
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // gap-8 (32) is the body ↔ footer break — the only boundary that
          // separates doing from committing. Everything inside the body breaks
          // at 20 or less, so this reads as a different level, not a bigger gap.
          "bg-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-8 rounded-xl border border-border p-6 shadow-2xl duration-200",
          dialogSizes[size],
          className
        )}
        {...props}
      >
        {children}
        {/* top-[29px], not top-4: this centres the ✕ on the title's cap line
            (measured 0.15px off) while staying on the same 24 column as the pad. */}
        <DialogPrimitive.Close className="data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-[29px] right-6 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-ring-edge disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

// Header and Content are wrapped into a *body*; the Footer is a peer of that
// whole body. The wrapper is the point of the design — without it the footer
// break sits at the same level as the header break and the model collapses.
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("flex flex-col gap-5", className)}
      {...props}
    />
  )
}

// The content band: fields, then the error slot. 32 to the error slot because a
// filled box has real mass — a heavy neighbour reads closer, so to read as
// separated it has to be measurably further.
function DialogSection({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-section"
      className={cn("flex flex-col gap-8", className)}
      {...props}
    />
  )
}

// gap-0: `head/600` already carries 13px between its own cap lines, which is
// the pair gap. Adding more separates the title from its own description.
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-0 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

// No `leading-none`. The title's line box is what the close ✕ and the 20 gap
// below it are measured against; collapsing it moves both.
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-head font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-fg-2 text-body", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogSection,
  DialogTitle,
  DialogTrigger,
}
export type { DialogSize }
