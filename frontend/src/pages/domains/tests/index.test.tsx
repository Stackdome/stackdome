// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SheetHost } from "@/test-support/sheet-host";
import { ConfirmProvider } from "@/components/branded/confirm";

import DomainsPage from "../index";
import type { Organization } from "@/api/organizations";

const getOrganizationMock = vi.fn();
const updateOrganizationMock = vi.fn();

vi.mock("@/api/organizations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/organizations")>()),
  getOrganization: (...args: unknown[]) => getOrganizationMock(...args),
  updateOrganization: (...args: unknown[]) => updateOrganizationMock(...args),
}));

vi.mock("@/lib/common", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/common")>()),
  getCurrentOrganizationId: () => "org-1",
}));

const baseOrganization = {
  id: "org-1",
  name: "Acme",
  is_platform: true,
} as Organization;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Radix restores `pointer-events` on unmount, and `cleanup()` tears the tree
  // down first — so a drawer left open in one test locks the next one out.
  document.body.style.pointerEvents = "";
});

describe("DomainsPage", () => {
  it("disables Add Domain when one domain exists", async () => {
    getOrganizationMock.mockResolvedValue({
      ...baseOrganization,
      domains: [{ fqdn: "apps.acme.dev" }],
    });
    render(
      <MemoryRouter initialEntries={["/domains"]}>
        <SheetHost>
          <DomainsPage />
        </SheetHost>
      </MemoryRouter>,
    );
    expect(await screen.findByText("apps.acme.dev")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add domain/ })).toBeDisabled();
    // The row carries no destroy control — that moved to the drawer's foot.
    expect(screen.queryByRole("button", { name: /Remove apps.acme.dev/ })).toBeNull();
  });

  it("keeps Add Domain enabled when no domains exist", async () => {
    getOrganizationMock.mockResolvedValue({ ...baseOrganization, domains: [] });
    render(
      <MemoryRouter initialEntries={["/domains"]}>
        <SheetHost>
          <DomainsPage />
        </SheetHost>
      </MemoryRouter>,
    );
    expect(await screen.findByText("No domain yet")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: /Add domain/ })) {
      expect(button).toBeEnabled();
    }
  });

  /**
   * Removing a domain used to fire on the first click — no gate, no undo, and
   * every stack served on it silently loses its address.
   */
  it("gates removal behind an acknowledged confirm", async () => {
    getOrganizationMock.mockResolvedValue({
      ...baseOrganization,
      domains: [{ fqdn: "apps.acme.dev" }],
    });
    render(
      <MemoryRouter initialEntries={["/domains"]}>
        <ConfirmProvider>
          <SheetHost>
            <DomainsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await screen.findByText("apps.acme.dev");

    const user = userEvent.setup();
    // The row opens the drawer; the removal lives at the foot of it.
    await user.click(screen.getByRole("link", { name: /apps.acme.dev domain/ }));
    const remove_trigger = await screen.findByRole("button", { name: /remove domain/i });
    expect(remove_trigger.closest('[data-slot="drawer-header"]')).toBeNull();
    await user.click(remove_trigger);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/remove domain\?/i);

    const remove = screen.getByRole("button", { name: "Remove" });
    expect(remove).toBeDisabled();
    expect(updateOrganizationMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox"));
    await user.click(remove);

    await waitFor(() => expect(updateOrganizationMock).toHaveBeenCalled());
    expect(updateOrganizationMock.mock.calls[0][1].domains).toEqual([]);
    // The object the drawer is about is gone, so the drawer goes with it.
    await waitFor(() => expect(screen.queryByText("DNS record")).toBeNull());
  });

  it("does not remove when the confirm is cancelled", async () => {
    getOrganizationMock.mockResolvedValue({
      ...baseOrganization,
      domains: [{ fqdn: "apps.acme.dev" }],
    });
    render(
      <MemoryRouter initialEntries={["/domains"]}>
        <ConfirmProvider>
          <SheetHost>
            <DomainsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await screen.findByText("apps.acme.dev");

    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: /apps.acme.dev domain/ }));
    await user.click(await screen.findByRole("button", { name: /remove domain/i }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(updateOrganizationMock).not.toHaveBeenCalled();
  });
});
