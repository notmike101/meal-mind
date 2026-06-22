import { SettingsForm } from "@/components/settings-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSettingsWithPantry } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { settings, pantryStaples } = await getSettingsWithPantry();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-moss">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Local planner settings</h1>
        <p className="mt-2 max-w-3xl text-ink/70">AI access, preferences, portions, and pantry staples.</p>
      </section>
      <section className="flex flex-col gap-3 rounded-md bg-surface p-5 shadow-line sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-ink/65">Theme</p>
        </div>
        <ThemeToggle />
      </section>
      <SettingsForm settings={settings} pantryStaples={pantryStaples} />
    </div>
  );
}
