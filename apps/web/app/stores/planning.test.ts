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

  it("updates a skipped day and refreshes planning state", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { id: "plan-1" } })
      .mockResolvedValueOnce({ ok: true, data: emptyState });
    vi.stubGlobal("$fetch", fetchMock);
    const store = usePlanningStore();

    await store.setDaySkipped("plan-1", "2026-07-08", true);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/plans/plan-1/skipped-days", {
      method: "PATCH",
      body: { date: "2026-07-08", skipped: true },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/plans/current", {});
  });
});
