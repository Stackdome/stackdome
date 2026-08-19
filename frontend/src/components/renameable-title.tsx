import * as React from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * **The page title, renamed where it is said.**
 *
 * The trail's last segment IS the title (§12a), and on a detail page that is
 * already the object's name — so renaming it anywhere else means putting the
 * same string in a second place and making you go and find it. A dialog with
 * one field, to change one word that is on screen the whole time, is friction
 * with nothing to show for it.
 *
 * | | |
 * |---|---|
 * | **At rest it is the title, unchanged** | No box, no button. A control that is always visible would make every page look like a form |
 * | **Hover is a wash and a pencil** | The wash is the same `--wash-hover` a row uses, so "you can act on this" is said in the vocabulary already on screen. The pencil appears only on hover or focus |
 * | **It is a real `<button>`** | The keyboard reaches it and Enter opens it. A `div` with an `onClick` would put the page's own name out of reach |
 * | **Editing swaps in a field the same size** | Same 14px medium, same box — the title does not jump between the two states |
 *
 * ### Committing, and refusing
 *
 * **Enter commits · clicking away commits · Escape reverts.** That is the
 * inline-rename convention everywhere it appears — Finder, Figma, Linear,
 * Notion — and a title that behaved differently would be the one control on
 * the screen you had to learn.
 *
 * It shipped for an afternoon with a ✓ and a ✕ beside the field and blur doing
 * nothing, on the reasoning that a name should not save by accident. **Two
 * buttons to confirm a single word is the wrong trade**: it puts a form in the
 * header, and it makes the ordinary path — type, click away — do nothing at
 * all, which reads as broken rather than careful. Escape is the undo, it is one
 * keystroke, and it is the key people already reach for.
 *
 * **Escape must not commit on its way out.** Leaving the field is what commits,
 * and cancelling leaves the field — so the two would collide and Escape would
 * save the thing it was asked to discard. `settledRef` closes the door behind
 * whichever exit ran first.
 *
 * The handler **rejects with a message** to refuse a name. The message lands
 * under the field, which keeps its focus and its text, so the fix is typing
 * rather than starting again — the constraint arrives in the imperative, next
 * to the control that broke it.
 */
export function RenameableTitle({
  name,
  onRename,
  className,
}: {
  name: string;
  /** Rejects with a message to refuse the name; the message is shown inline. */
  onRename: (next: string) => Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(name);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // One exit per edit. Blur fires as the field unmounts, so without this a
  // cancel or a completed commit would immediately trigger a second commit.
  const settledRef = React.useRef(false);

  // The name can change under us — another tab, a refetch — and an edit in
  // flight must not be clobbered by it.
  React.useEffect(() => {
    if (!editing) setValue(name);
  }, [name, editing]);

  function open() {
    settledRef.current = false;
    setValue(name);
    setError(null);
    setEditing(true);
    // The field mounts this tick; select it on the next.
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function cancel() {
    settledRef.current = true;
    setEditing(false);
    setError(null);
    setValue(name);
  }

  async function commit() {
    if (settledRef.current || busy) return;
    const next = value.trim();
    if (next === name) return cancel();
    if (!next) {
      // Not a silent revert: clearing a name and clicking away is a mistake,
      // and it should say so rather than quietly put the old one back as
      // though nothing had happened.
      setError("Give the stack a name.");
      inputRef.current?.focus();
      return;
    }
    settledRef.current = true;
    setBusy(true);
    try {
      await onRename(next);
      setEditing(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That name could not be saved.");
      // Refused, so the edit is live again — reopen the door and put the caret
      // back where the fix has to be typed.
      settledRef.current = false;
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        // The visible text is the NAME; the accessible name says what pressing
        // it does. It contains the visible string, so the two do not disagree
        // — a screen reader hears "Rename orders-api", which is the whole
        // affordance a sighted user gets from the pencil on hover.
        aria-label={`Rename ${name}`}
        title={`Rename ${name}`}
        className={cn(
          "group focus-ring-edge -mx-1.5 flex h-7 items-center gap-1.5 rounded-sm px-1.5",
          "text-title font-medium text-foreground transition-colors",
          "hover:bg-[var(--wash-hover)]",
          className,
        )}
      >
        {name}
        <Pencil
          aria-hidden
          className="size-3 flex-none text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </button>
    );
  }

  return (
    <span className="relative flex items-center">
      <input
        ref={inputRef}
        aria-label="Stack name"
        aria-invalid={!!error}
        aria-errormessage={error ? "rename-error" : undefined}
        disabled={busy}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        // Leaving the field is what saves. No ✓ and no ✕ — the header is not a
        // form, and the two exits people already know are Enter and Escape.
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className={cn(
          "focus-ring-edge -mx-1.5 h-7 w-[22ch] rounded-sm border bg-card px-1.5",
          "text-title font-medium text-foreground",
          error ? "border-danger" : "border-border",
        )}
      />
      {/* Under the field, not in the row — an absolutely-positioned message
          keeps the header's two rows exactly where they were, so refusing a
          name does not shove the tab row down. */}
      {error && (
        <span
          id="rename-error"
          role="alert"
          className="absolute left-0 top-full mt-1 whitespace-nowrap text-meta text-danger"
        >
          {error}
        </span>
      )}
    </span>
  );
}
