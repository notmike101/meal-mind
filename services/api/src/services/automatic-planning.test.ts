import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomaticPlanningService } from "./automatic-planning";

function createService(overrides: Partial<ConstructorParameters<typeof AutomaticPlanningService>[0]> = {}) {
  const dependencies: ConstructorParameters<typeof AutomaticPlanningService>[0] = {
    getSettings: vi.fn().mockResolvedValue({
      autoGenerateNextWeek: true,
      timezone: "America/Chicago",
    }),
    getPlanByWeekStart: vi.fn().mockResolvedValue(null),
    generateWeeklyPlan: vi.fn().mockResolvedValue({ id: "plan-1" }),
    now: () => new Date("2026-06-29T18:00:00.000Z"),
    intervalMs: 1_000,
    logger: { info: vi.fn(), warn: vi.fn() },
    ...overrides,
  };
  return { service: new AutomaticPlanningService(dependencies), dependencies };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("AutomaticPlanningService", () => {
  it("generates the configured timezone's next week when it is missing", async () => {
    const { service, dependencies } = createService();

    await service.trigger();

    expect(dependencies.getPlanByWeekStart).toHaveBeenCalledWith("2026-07-06");
    expect(dependencies.generateWeeklyPlan).toHaveBeenCalledWith({
      weekStart: "2026-07-06",
      replaceExisting: false,
    });
  });

  it("does nothing when automation is disabled or a plan already exists", async () => {
    const disabled = createService({
      getSettings: vi.fn().mockResolvedValue({ autoGenerateNextWeek: false, timezone: "America/Chicago" }),
    });
    await disabled.service.trigger();
    expect(disabled.dependencies.getPlanByWeekStart).not.toHaveBeenCalled();
    expect(disabled.dependencies.generateWeeklyPlan).not.toHaveBeenCalled();

    const existing = createService({ getPlanByWeekStart: vi.fn().mockResolvedValue({ id: "existing" }) });
    await existing.service.trigger();
    expect(existing.dependencies.generateWeeklyPlan).not.toHaveBeenCalled();
  });

  it("collapses overlapping checks into one generation", async () => {
    let finishGeneration: (() => void) | undefined;
    const generateWeeklyPlan = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => {
        finishGeneration = resolve;
      }),
    );
    const { service } = createService({ generateWeeklyPlan });

    const first = service.trigger();
    const second = service.trigger();
    await vi.waitFor(() => expect(generateWeeklyPlan).toHaveBeenCalledOnce());
    finishGeneration?.();
    await Promise.all([first, second]);

    expect(generateWeeklyPlan).toHaveBeenCalledOnce();
  });

  it("contains failures and retries on the next check", async () => {
    const generateWeeklyPlan = vi.fn()
      .mockRejectedValueOnce(new Error("AI offline"))
      .mockResolvedValueOnce({ id: "plan-1" });
    const logger = { info: vi.fn(), warn: vi.fn() };
    const { service } = createService({ generateWeeklyPlan, logger });

    await service.trigger();
    await service.trigger();

    expect(generateWeeklyPlan).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("checks immediately and then on the configured interval", async () => {
    vi.useFakeTimers();
    const { service, dependencies } = createService();

    service.start();
    await service.trigger();
    expect(dependencies.generateWeeklyPlan).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(dependencies.generateWeeklyPlan).toHaveBeenCalledTimes(2);
    service.stop();
  });
});
