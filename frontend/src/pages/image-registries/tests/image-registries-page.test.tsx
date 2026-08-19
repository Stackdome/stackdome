// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageRegistriesPage from "../index";
import { ConfirmProvider } from "@/components/branded/confirm";
import { PURPOSE_BOTH } from "../lib/providers";

afterEach(cleanup);

const toastMock = vi.fn();

vi.mock("@/api/registry-credentials", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listRegistryCredentials: vi.fn(),
  deleteRegistryCredential: vi.fn(),
  updateRegistryCredential: vi.fn(),
  createRegistryCredential: vi.fn(),
  verifyRegistryCredential: vi.fn(),
}));
vi.mock("@/lib/common", () => ({ getCurrentOrganizationId: () => "org-1" }));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock, dismiss: vi.fn(), toasts: [] }),
}));

import {
  listRegistryCredentials, deleteRegistryCredential, updateRegistryCredential,
} from "@/api/registry-credentials";

const row = { id: "r1", host: "index.docker.io", username: "bob", purpose: PURPOSE_BOTH };

describe("ImageRegistriesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the empty state with an add action when list is empty", async () => {
    vi.mocked(listRegistryCredentials).mockResolvedValue({ items: [] });
    render(<ConfirmProvider><ImageRegistriesPage /></ConfirmProvider>);
    await waitFor(() => expect(screen.getByText(/no registries yet/i)).toBeInTheDocument());
    expect(screen.getAllByRole("button", { name: /add registry/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("lists registries in the panel", async () => {
    vi.mocked(listRegistryCredentials).mockResolvedValue({ items: [row] });
    render(<ConfirmProvider><ImageRegistriesPage /></ConfirmProvider>);
    await waitFor(() => expect(screen.getByText("index.docker.io")).toBeInTheDocument());
    // The list renders as a data list, with its columns labelled.
    expect(screen.getByText("Purpose")).toBeInTheDocument();
    expect(screen.getByText("Pull & push")).toBeInTheDocument();
  });

  it("opens the rotation dialog from the row menu and PUTs on submit", async () => {
    vi.mocked(listRegistryCredentials).mockResolvedValue({ items: [row] });
    vi.mocked(updateRegistryCredential).mockResolvedValue(row);
    const user = userEvent.setup();
    render(<ConfirmProvider><ImageRegistriesPage /></ConfirmProvider>);
    await waitFor(() => expect(screen.getByText("index.docker.io")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^actions for /i }));
    await user.click(await screen.findByRole("menuitem", { name: /update credentials/i }));

    await user.type(await screen.findByLabelText(/password/i), "n3w");
    await user.click(screen.getByRole("button", { name: /^update credentials$/i }));

    await waitFor(() => {
      expect(updateRegistryCredential).toHaveBeenCalledWith("org-1", "r1", {
        host: "index.docker.io",
        purpose: PURPOSE_BOTH,
        username: "bob",
        password: "n3w",
      });
    });
    expect(listRegistryCredentials).toHaveBeenCalledTimes(2);
  });

  it("removes a registry and warns about affected stacks", async () => {
    vi.mocked(listRegistryCredentials).mockResolvedValue({ items: [row] });
    vi.mocked(deleteRegistryCredential).mockResolvedValue({
      affected_stacks: [{ id: "s1", name: "webapp" }],
    });
    const user = userEvent.setup();
    render(<ConfirmProvider><ImageRegistriesPage /></ConfirmProvider>);
    await waitFor(() => expect(screen.getByText("index.docker.io")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^actions for /i }));
    await user.click(await screen.findByRole("menuitem", { name: /remove registry/i }));
    await user.click(await screen.findByRole("button", { name: /^remove$/i }));

    await waitFor(() => {
      expect(deleteRegistryCredential).toHaveBeenCalledWith("org-1", "r1");
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: expect.stringMatching(/webapp/) }),
      );
    });
  });
});
