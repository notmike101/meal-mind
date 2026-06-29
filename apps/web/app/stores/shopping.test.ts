import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShoppingStore } from "./shopping";

describe("shopping store", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => vi.unstubAllGlobals());

  it("selects the active plan before a draft", async () => {
    const activePlan = {
      id: "active",
      weekStart: "2026-06-29",
      weekEnd: "2026-07-05",
      status: "active",
      slots: [],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        data: {
          activePlan,
          nextDraft: { ...activePlan, id: "draft", status: "draft" },
          nextWeek: { weekStart: "2026-07-06", weekEnd: "2026-07-12" },
        },
      })
      .mockResolvedValueOnce({ ok: true, data: null });
    vi.stubGlobal("$fetch", fetchMock);

    const store = useShoppingStore();
    await store.fetchCurrent();
    expect(store.plan?.id).toBe("active");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/plans/active/shopping-list", {});
  });
});
