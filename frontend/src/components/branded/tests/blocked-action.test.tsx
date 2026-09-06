// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { BlockedAction } from "../blocked-action";
import { Button } from "@/components/ui/button";

// Radix tooltip content reads ResizeObserver on mount, which jsdom doesn't implement.
beforeAll(() => {
  global.ResizeObserver =
    global.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

afterEach(cleanup);

describe("BlockedAction", () => {
  it("renders the action untouched when the limit is not reached", () => {
    const onClick = vi.fn();
    render(
      <BlockedAction reason={null}>
        <Button onClick={onClick}>Add Cluster</Button>
      </BlockedAction>,
    );
    const button = screen.getByRole("button", { name: "Add Cluster" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables the action when the limit is reached", () => {
    const onClick = vi.fn();
    render(
      <BlockedAction reason="Currently only one cluster is supported.">
        <Button onClick={onClick}>Add Cluster</Button>
      </BlockedAction>,
    );
    const button = screen.getByRole("button", { name: "Add Cluster" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows the limit message as a tooltip when the trigger receives focus", async () => {
    render(
      <BlockedAction reason="Currently only one domain is supported.">
        <Button>Add Domain</Button>
      </BlockedAction>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Add Domain" }).parentElement!);
    expect(await screen.findAllByText("Currently only one domain is supported.")).not.toHaveLength(0);
  });
});
