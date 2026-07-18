import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlanningStore } from "./planning";

const emptyState = {
  activePlan: null,
  nextDraft: null,
  currentWeek: { weekStart: "2026-06-29", weekEnd: "2026-07-05" },
  nextWeek: { weekStart: "2026-07-06", weekEnd: "2026-07-12" },
};

describe("planning store", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => vi.unstubAllGlobals());

  it("refreshes the exact selected week after generation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { id: "draft" } })
      .mockResolvedValueOnce({ ok: true, data: emptyState })
      .mockResolvedValueOnce({ ok: true, data: [] })
      .mockResolvedValueOnce({ ok: true, data: { id: "draft", weekStart: "2026-07-06" } });
    vi.stubGlobal("$fetch", fetchMock);
    const store = usePlanningStore();
    store.selectedWeekStart = "2026-07-06";

    await store.generate("2026-07-06", false, 9);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/plans/generate", {
      method: "POST",
      body: { weekStart: "2026-07-06", replaceExisting: false, mealCount: 9 },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/plans/by-week/2026-07-06", {});
    expect(store.selectedPlan?.id).toBe("draft");
  });

  it("does not let a stale week response replace newer navigation", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    const first = new Promise((resolve) => { resolveFirst = resolve; });
    const fetchMock = vi.fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ ok: true, data: { id: "newer", weekStart: "2026-07-13" } });
    vi.stubGlobal("$fetch", fetchMock);
    const store = usePlanningStore();

    const oldRequest = store.fetchWeek("2026-07-06");
    await store.fetchWeek("2026-07-13");
    resolveFirst?.({ ok: true, data: { id: "older", weekStart: "2026-07-06" } });
    await oldRequest;

    expect(store.selectedWeekStart).toBe("2026-07-13");
    expect(store.selectedPlan?.id).toBe("newer");
  });
});
