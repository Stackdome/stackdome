// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegistryRow } from "../registry-row";
import { PURPOSE_PULL, PURPOSE_BOTH } from "../../lib/providers";
import type { RegistryCredential } from "@/api/registry-credentials";

afterEach(cleanup);

const credential: RegistryCredential = {
  id: "r1",
  host: "index.docker.io",
  username: "bob",
  purpose: PURPOSE_BOTH,
};

function renderRow(props: Partial<Parameters<typeof RegistryRow>[0]> = {}) {
  return render(
    <RegistryRow credential={credential} onOpen={vi.fn()} {...props} />
  );
}

describe("RegistryRow", () => {
  it("displays the provider label and host", () => {
    renderRow();
    expect(screen.getByText("Docker Hub")).toBeInTheDocument();
    expect(screen.getByText("index.docker.io")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("labels a pull-and-push credential", () => {
    renderRow();
    expect(screen.getByText("Pull & push")).toBeInTheDocument();
  });

  it("labels a pull-only credential", () => {
    renderRow({ credential: { ...credential, purpose: PURPOSE_PULL } });
    expect(screen.getByText("Pull only")).toBeInTheDocument();
  });

  /**
   * **The row opens the registry, and carries nothing else.**
   *
   * It used to hold a kebab with three acts on one object — verify, rotate,
   * remove — behind a click that had to happen before you could see any of
   * them. All three live on the drawer the row opens.
   */
  it("opens the credential and holds no actions of its own", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    renderRow({ onOpen });

    expect(screen.queryByRole("button")).toBeNull();
    await user.click(screen.getByRole("link", { name: /docker hub registry/i }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(credential));
  });

});
