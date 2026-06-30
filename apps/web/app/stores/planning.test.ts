import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlanningStore } from "./planning";

const emptyState = {
  activePlan: null,
  nextDraft: null,
  nextWeek: { weekStart: "2026-07-06", weekEnd: "2026-07-12" },
};

describe("planning store", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => vi.unstubAllGlobals());

  it("loads planning state and refreshes after generation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: emptyState })
      .mockResolvedValueOnce({ ok: true, data: { id: "draft" } })
      .mockResolvedValueOnce({ ok: true, data: emptyState });
    vi.stubGlobal("$fetch", fetchMock);
    const store = usePlanningStore();

    await store.fetchState();
    expect(store.nextWeek).toEqual(emptyState.nextWeek);
    await store.generate(true);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/plans/generate", {
      method: "POST",
      body: { replaceExisting: true },
    });
  });
});
