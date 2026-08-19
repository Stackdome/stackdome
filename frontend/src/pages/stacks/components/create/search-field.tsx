import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * The one search box every catalogue tab uses.
 *
 * 32px, not 40 (§8/§11): a search is a **working control**, and 40 is reserved
 * for form fields and their primary button. There are no true form fields in
 * this flow — the configuration lives on the canvas.
 *
 * It runs the full width of the body column rather than the toolbar's 300px,
 * because here it is the only control above a long list rather than one of
 * several in a row.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  disabled,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** The accessible name. The placeholder disappears the moment you type. */
  label: string
  /**
   * There is nothing to search yet — the provider that would fill the list is
   * not connected.
   *
   * **It stays on screen rather than disappearing.** §9's rule about a dead end
   * is about a control that refuses without saying why; here the reason is the
   * empty state directly beneath it, in full, with the fix as a button. Pulling
   * the field out instead would make the control band change shape between two
   * states of the same tab, and the segmented control beside it would jump.
   */
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn("relative", disabled && "opacity-50", className)}>
      {/* 16px glyph on the field's own 12px inset, with an 8px gap to the text
          — the same three numbers the Field primitive uses, so a search box and
          a form field share one leading edge. */}
      <Search
        aria-hidden
        className="text-fg-muted absolute left-3 top-1/2 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        disabled={disabled}
        className="pl-9"
      />
    </div>
  )
}
