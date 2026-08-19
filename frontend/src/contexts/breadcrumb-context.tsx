import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { createContext } from "react";

export type BreadcrumbContextType = {
  customLabels: Record<string, string>;
  setCustomLabel: (path: string, label: string) => void;
  loadingLabels: Record<string, boolean>;
  setPathLoading: (path: string, isLoading: boolean) => void;
  nonClickablePaths: Record<string, boolean>;
  registerNonClickablePath: (path: string) => () => void;
  /**
   * The origin of the journey currently on screen, or `null` on an ordinary
   * page. A journey is a task launched from a main screen — `New stack` — as
   * opposed to a place you navigated down into (§12a).
   *
   * It lives here rather than as a `SheetHeader` prop because the header is
   * rendered once by `AppLayout`, and because registering it changes the trail
   * as well as adding the back arrow: a journey shows **its title alone**.
   */
  journeyOrigin: string | null;
  registerJourney: (origin: string) => () => void;
  /**
   * Path segments that are an **in-page selection**, not a place.
   *
   * `/previews/:configId` resolves to the previews screen with that repository
   * selected in its rail — the same screen, not a nested one. §12a already says
   * such a selection may not rename the title; it may not grow a crumb either,
   * for exactly the same reason. The address survives because people have it
   * bookmarked; the trail does not, because there is nowhere to go back to.
   */
  selectionPaths: Record<string, boolean>;
  registerSelectionPath: (path: string) => () => void;
  /**
   * Paths whose title can be **renamed in place**, and what to call to do it.
   *
   * The trail's last segment IS the page title (§12a), so for a detail page it
   * is already the object's name, in the one place on screen that names it. A
   * separate "Rename" dialog would put the same string somewhere else and make
   * you go find it.
   *
   * It lives here for the same reason `journeyOrigin` does: the header is
   * rendered once by `AppLayout` and has no idea which page is under it, so the
   * page has to hand the capability up. Registering is also what says the title
   * is renameable at all — a page that does not register gets a plain title and
   * no affordance, which is correct for a list page and for anything whose name
   * is genuinely fixed.
   *
   * The handler **rejects with a message** to refuse a name; the header shows
   * that message and keeps you in the field.
   */
  renameHandlers: Record<string, (name: string) => Promise<void>>;
  registerRename: (path: string, rename: (name: string) => Promise<void>) => () => void;
};

export const BreadcrumbContext = createContext<BreadcrumbContextType>({
  customLabels: {},
  setCustomLabel: () => {},
  loadingLabels: {},
  setPathLoading: () => {},
  nonClickablePaths: {},
  registerNonClickablePath: () => () => {},
  journeyOrigin: null,
  registerJourney: () => () => {},
  selectionPaths: {},
  registerSelectionPath: () => () => {},
  renameHandlers: {},
  registerRename: () => () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [loadingLabels, setLoadingLabels] = useState<Record<string, boolean>>({});
  const [nonClickablePaths, setNonClickablePaths] = useState<Record<string, boolean>>({});
  const [journeyOrigin, setJourneyOrigin] = useState<string | null>(null);
  const [selectionPaths, setSelectionPaths] = useState<Record<string, boolean>>({});
  const [renameHandlers, setRenameHandlers] = useState<
    Record<string, (name: string) => Promise<void>>
      >({});

  const setCustomLabel = useCallback((path: string, label: string) => {
    setCustomLabels((prev) => ({
      ...prev,
      [path]: label,
    }));
  }, []);

  const setPathLoading = useCallback((path: string, isLoading: boolean) => {
    setLoadingLabels((prev) => ({
      ...prev,
      [path]: isLoading,
    }));
  }, []);

  // Only one journey can be on screen at a time, so this is a single value
  // rather than a map. Unregistering clears it only if it is still ours — on a
  // journey-to-journey move the next page mounts before this one unmounts.
  const registerJourney = useCallback((origin: string) => {
    setJourneyOrigin(origin);
    return () => setJourneyOrigin((prev) => (prev === origin ? null : prev));
  }, []);

  const registerSelectionPath = useCallback((path: string) => {
    setSelectionPaths((prev) => (prev[path] ? prev : { ...prev, [path]: true }));
    return () => {
      setSelectionPaths((prev) => {
        if (!(path in prev)) return prev;
        const next = { ...prev };
        delete next[path];
        return next;
      });
    };
  }, []);

  // Keyed by path rather than held as a single value: unlike a journey, more
  // than one renameable page can be mounted at once during a route transition,
  // and the header reads the one whose path it is actually drawing.
  const registerRename = useCallback(
    (path: string, rename: (name: string) => Promise<void>) => {
      setRenameHandlers((prev) => ({ ...prev, [path]: rename }));
      return () => {
        setRenameHandlers((prev) => {
          if (!(path in prev)) return prev;
          const next = { ...prev };
          delete next[path];
          return next;
        });
      };
    },
    [],
  );

  const registerNonClickablePath = useCallback((path: string) => {
    setNonClickablePaths((prev) =>
      prev[path] ? prev : { ...prev, [path]: true },
    );
    return () => {
      setNonClickablePaths((prev) => {
        if (!(path in prev)) return prev;
        const next = { ...prev };
        delete next[path];
        return next;
      });
    };
  }, []);

  return (
    <BreadcrumbContext.Provider
      value={{
        customLabels,
        setCustomLabel,
        loadingLabels,
        setPathLoading,
        nonClickablePaths,
        registerNonClickablePath,
        journeyOrigin,
        registerJourney,
        selectionPaths,
        registerSelectionPath,
        renameHandlers,
        registerRename,
      }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
}
