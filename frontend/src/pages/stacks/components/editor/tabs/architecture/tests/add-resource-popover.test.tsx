// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AddResourcePopover } from "../add-resource-popover";

afterEach(cleanup);

function open(props: Partial<React.ComponentProps<typeof AddResourcePopover>> = {}) {
  render(
    <AddResourcePopover
      addedIds={[]}
      onAdd={() => {}}
      addons={[]}
      linkedAddonIds={new Set()}
      onLinkAddon={() => {}}
      canAddVolume
      onAddVolume={vi.fn()}
      {...props}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Add resource/i }));
}

describe("AddResourcePopover managed addons", () => {
  // An add-on row is an OPTION, not a button: a link can be undone, so the row
  // carries state. Block rows stay buttons — a click there is the whole act.
  it("lists linked-able addons and links on click", () => {
    const onLinkAddon = vi.fn();
    open({ addons: [{ id: "a1", name: "prod-db" }], onLinkAddon });
    fireEvent.click(screen.getByRole("option", { name: /prod-db/i }));
    expect(onLinkAddon).toHaveBeenCalledWith("a1");
  });

  it("reports a linked addon as selected", () => {
    open({ addons: [{ id: "a1", name: "prod-db" }], linkedAddonIds: new Set(["a1"]) });
    expect(screen.getByRole("option", { name: /prod-db/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("puts the options in a multi-select listbox", () => {
    open({ addons: [{ id: "a1", name: "prod-db" }] });
    const list = screen.getByRole("listbox", { name: "Managed add-ons" });
    expect(list).toHaveAttribute("aria-multiselectable", "true");
    expect(list).toContainElement(screen.getByRole("option", { name: /prod-db/i }));
  });
});

describe("AddResourcePopover storage tile search", () => {
  it("shows the Storage section when searching 'storage', matching its header", () => {
    open();
    fireEvent.change(screen.getByPlaceholderText(/Search resources/i), {
      target: { value: "storage" },
    });
    expect(screen.getByText("Storage")).toBeInTheDocument();
    expect(screen.getByText("Volume")).toBeInTheDocument();
  });

  it("still shows the Storage section when searching 'volume'", () => {
    open();
    fireEvent.change(screen.getByPlaceholderText(/Search resources/i), {
      target: { value: "volume" },
    });
    expect(screen.getByText("Storage")).toBeInTheDocument();
  });

  it("hides the Storage section for unrelated queries", () => {
    open();
    fireEvent.change(screen.getByPlaceholderText(/Search resources/i), {
      target: { value: "postgres" },
    });
    expect(screen.queryByText("Storage")).toBeNull();
  });

  // The volume row explains itself on its own second line rather than in a
  // tooltip — §9, and the focusable tooltip wrapper it replaced was what broke
  // arrow-key traversal through the list.
  it("states why a volume cannot be added yet, on the row", () => {
    open({ canAddVolume: false });
    const row = screen.getByRole("button", { name: /Volume/i });
    expect(row).toBeDisabled();
    expect(row).toHaveTextContent(/volumes attach to a service/i);
  });
});

describe("AddResourcePopover list", () => {
  // No doors: every section is a label and every row is on screen or one scroll
  // away. A collapsing variant was built and came off after judging it live.
  it("shows every section open, with no disclosure to click", () => {
    open();
    expect(screen.getByText("Web service")).toBeInTheDocument();
    expect(screen.getByText("Postgres")).toBeInTheDocument();
    expect(screen.getByText("Redis")).toBeInTheDocument();
    expect(screen.queryByRole("button", { expanded: false })).toBeNull();
  });

  // A click on the row is the add. A `+` at the end would be a second
  // affordance for the act the row already performs.
  it("gives a block row no trailing control", () => {
    open();
    const row = screen.getByRole("button", { name: /Web service/i });
    expect(row.querySelectorAll("svg")).toHaveLength(1); // the block glyph, and nothing after it
  });
});
