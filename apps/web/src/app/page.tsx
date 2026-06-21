import { CalendarCheck, CalendarClock } from "lucide-react";
import { DailyReminder } from "@/components/daily-reminder";
import { GeneratePlanButton } from "@/components/generate-plan-button";
import { formatDateInTimeZone } from "@helloqwen/domain";
import { getPlanningState, getSettingsWithPantry } from "@/lib/api-client";
import { formatDisplayDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ settings }, { activePlan, nextDraft, nextWeek }] = await Promise.all([
    getSettingsWithPantry(),
    getPlanningState(),
  ]);
  const today = formatDateInTimeZone(new Date(), settings.timezone);
  const todaySlots = activePlan?.slots.filter((slot) => slot.date === today) ?? [];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-moss">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Today&apos;s plan</h1>
        <p className="mt-2 max-w-3xl text-ink/70">
          {formatDisplayDate(today)} · Planning in {settings.timezone}
        </p>
      </section>

      {activePlan ? (
        <DailyReminder slots={todaySlots} />
      ) : (
        <section className="rounded-md bg-white p-5 shadow-line">
          <div className="flex items-center gap-2 text-ink">
            <CalendarClock size={20} aria-hidden="true" />
            <h2 className="text-xl font-semibold">No active plan today</h2>
          </div>
          <p className="mt-2 text-ink/70">No committed meals are scheduled for today.</p>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-white p-5 shadow-line">
          <div className="flex items-center gap-2">
            <CalendarCheck size={19} aria-hidden="true" />
            <h2 className="font-semibold">Next week</h2>
          </div>
          <p className="mt-2 text-sm text-ink/65">
            {nextWeek.weekStart} through {nextWeek.weekEnd}
          </p>
          <div className="mt-4">
            <GeneratePlanButton replaceExisting={nextDraft?.status === "draft"} />
          </div>
        </div>
        <div className="rounded-md bg-white p-5 shadow-line">
          <h2 className="font-semibold">Draft status</h2>
          {nextDraft ? (
            <p className="mt-2 text-sm text-ink/65">
              {nextDraft.weekStart} plan is {nextDraft.status} with {nextDraft.slots.length} meals.
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink/65">No upcoming draft exists yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
