import type { SettingsDto } from "@mealmind/contracts";
import { getNextWeekRange } from "@mealmind/domain";
import { getPlanByWeekStart } from "@mealmind/db/repositories/plans";
import { getSettings } from "@mealmind/db/repositories/settings";
import { generateWeeklyPlan } from "./planning.js";

export const AUTOMATIC_PLANNING_INTERVAL_MS = 15 * 60 * 1000;

type AutomaticPlanningLogger = {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
};

type AutomaticPlanningDependencies = {
  getSettings(): Promise<Pick<SettingsDto, "autoGenerateNextWeek" | "timezone">>;
  getPlanByWeekStart(weekStart: string): Promise<unknown | null>;
  generateWeeklyPlan(input: { weekStart: string; replaceExisting: false }): Promise<unknown>;
  now(): Date;
  intervalMs: number;
  logger: AutomaticPlanningLogger;
};

export class AutomaticPlanningService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running: Promise<void> | null = null;

  constructor(private readonly dependencies: AutomaticPlanningDependencies) {}

  start() {
    if (this.timer) return;

    void this.trigger();
    this.timer = setInterval(() => void this.trigger(), this.dependencies.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  trigger() {
    if (this.running) return this.running;

    const run = this.check().finally(() => {
      if (this.running === run) this.running = null;
    });
    this.running = run;
    return run;
  }

  private async check() {
    let weekStart: string | undefined;
    let generationStarted = false;

    try {
      const settings = await this.dependencies.getSettings();
      if (!settings.autoGenerateNextWeek) return;

      weekStart = getNextWeekRange(this.dependencies.now(), settings.timezone).weekStart;
      if (await this.dependencies.getPlanByWeekStart(weekStart)) return;

      generationStarted = true;
      await this.dependencies.generateWeeklyPlan({ weekStart, replaceExisting: false });
      this.dependencies.logger.info({ weekStart }, "Automatically generated next week's meal plan.");
    } catch (error) {
      if (generationStarted && weekStart) {
        const planNowExists = await this.dependencies.getPlanByWeekStart(weekStart).catch(() => null);
        if (planNowExists) {
          this.dependencies.logger.info(
            { weekStart },
            "Skipped automatic meal plan generation because the plan was created concurrently.",
          );
          return;
        }
      }

      this.dependencies.logger.warn(
        { err: error, weekStart },
        "Automatic meal plan generation failed; it will retry on the next check.",
      );
    }
  }
}

export function createAutomaticPlanningService(logger: AutomaticPlanningLogger) {
  return new AutomaticPlanningService({
    getSettings,
    getPlanByWeekStart,
    generateWeeklyPlan,
    now: () => new Date(),
    intervalMs: AUTOMATIC_PLANNING_INTERVAL_MS,
    logger,
  });
}
