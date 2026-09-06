// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastMock = vi.fn();

// Radix's Select measures its trigger with a ResizeObserver and scrolls the
// highlighted option into view; jsdom implements neither.
beforeAll(() => {
  global.ResizeObserver =
    global.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
});

vi.mock("@/api/registry-credentials", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createRegistryCredential: vi.fn(),
}));
vi.mock("@/lib/common", () => ({ getCurrentOrganizationId: () => "org-1" }));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock, dismiss: vi.fn(), toasts: [] }),
}));

import { createRegistryCredential } from "@/api/registry-credentials";
import { AddRegistryDrawer } from "../add-registry-drawer";
import { PURPOSE_BOTH, REGISTRY_PROVIDERS } from "../../lib/providers";

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const open = (props: Partial<Parameters<typeof AddRegistryDrawer>[0]> = {}) =>
  render(<AddRegistryDrawer open onOpenChange={vi.fn()} onCreated={vi.fn()} {...props} />);

type User = ReturnType<typeof userEvent.setup>;

const pick = (user: User, name: string | RegExp) =>
  user.click(screen.getByRole("option", { name }));

/**
 * The footer's button and the path's first crumb are both called
 * `Add registry` — the task names the journey and the primary names the act,
 * and on this flow they are the same words. Both queries are scoped to a band.
 */
const primary = () =>
  within(document.querySelector('[data-slot="drawer-footer"]') as HTMLElement).getByRole("button");
const crumb = () =>
  within(document.querySelector('[data-slot="drawer-path"]') as HTMLElement).getByRole("button", {
    name: "Add registry",
  });

const fillCredentials = async (user: User) => {
  await user.type(screen.getByLabelText(/^username/i), "acme-ci");
  await user.type(screen.getByLabelText(/^password/i), "s3cret");
};

describe("AddRegistryDrawer", () => {
  it("opens on the catalogue, with no footer and no primary", () => {
    open();

    expect(screen.getByText("Pick a registry")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(REGISTRY_PROVIDERS.length);
    expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull();
    // Step one's crumbs point at the screen you are on, so neither is live.
    expect(document.querySelector('[data-slot="drawer-path"] button')).toBeNull();
  });

  it("advances on a pick, naming the step and prefilling the host", async () => {
    const user = userEvent.setup();
    open();

    await pick(user, /Docker Hub/i);
    expect(screen.getByLabelText(/^host/i)).toHaveValue("docker.io");
    expect(primary()).toHaveTextContent("Add registry");
  });

  it("blocks the primary while a field is empty, and does not call the API", async () => {
    const user = userEvent.setup();
    open();

    await pick(user, /Other/i);
    expect(primary()).toBeDisabled();

    await user.click(primary());
    expect(createRegistryCredential).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^host/i), "registry.acme.dev");
    await fillCredentials(user);
    expect(primary()).toBeEnabled();
  });

  it("clears typed credentials when the crumb returns and another registry is picked", async () => {
    const user = userEvent.setup();
    open();

    await pick(user, /Docker Hub/i);
    await fillCredentials(user);
    // The crumb is the way back — there is no `Back` button anywhere now.
    await user.click(crumb());
    await pick(user, /Quay/i);

    expect(screen.getByLabelText(/^host/i)).toHaveValue("quay.io");
    expect(screen.getByLabelText(/^username/i)).toHaveValue("");
    expect(screen.getByLabelText(/^password/i)).toHaveValue("");
  });

  it("creates a credential with the default purpose and reports success", async () => {
    vi.mocked(createRegistryCredential).mockResolvedValue({ id: "r1", host: "docker.io", username: "acme-ci" });
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    open({ onCreated, onOpenChange });

    await pick(user, /Docker Hub/i);
    await fillCredentials(user);
    await user.click(primary());

    await waitFor(() => {
      expect(createRegistryCredential).toHaveBeenCalledWith("org-1", {
        host: "docker.io",
        username: "acme-ci",
        password: "s3cret",
        purpose: PURPOSE_BOTH,
      });
      expect(onCreated).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("keeps the drawer open and shows a non-conflict failure in its footer", async () => {
    vi.mocked(createRegistryCredential).mockRejectedValue(new Error("boom"));
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    open({ onOpenChange });

    await pick(user, /Docker Hub/i);
    await fillCredentials(user);
    await user.click(primary());

    const banner = await screen.findByText(/boom/i);
    expect(banner.closest('[data-slot="drawer-footer"]')).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("shows a 409 conflict on the host field, not as a toast", async () => {
    const conflict = Object.assign(new Error("conflict"), {
      isAxiosError: true,
      response: { status: 409 },
    });
    vi.mocked(createRegistryCredential).mockRejectedValue(conflict);
    const user = userEvent.setup();
    open();

    await pick(user, /Docker Hub/i);
    await fillCredentials(user);
    await user.click(primary());

    expect(
      await screen.findByText(/credentials for this registry and purpose already exist/i),
    ).toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalled();
  });
});
