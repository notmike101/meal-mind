"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlugZap, Save } from "lucide-react";
import type { PantryStapleDto, SettingsDto } from "@helloqwen/contracts";

type SettingsFormProps = {
  settings: SettingsDto;
  pantryStaples: PantryStapleDto[];
};

export function SettingsForm({ settings, pantryStaples }: SettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    timezone: settings.timezone,
    aiBaseUrl: settings.aiBaseUrl,
    aiModel: settings.aiModel,
    planningPreferences: settings.planningPreferences,
    planningVarietyRules: settings.planningVarietyRules,
    defaultLunchServings: settings.defaultLunchServings,
    defaultDinnerServings: settings.defaultDinnerServings,
    pantryStaples: pantryStaples.map((staple) => staple.name).join("\n"),
  });
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pantryStaples: form.pantryStaples.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message ?? "Could not save settings.");
      }
      setStatus("Settings saved.");
      router.refresh();
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function testAi() {
    setBusy(true);
    setStatus(null);
    try {
      await save();
      const response = await fetch("/api/settings/test-ai", { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message ?? "AI test failed.");
      }
      const modelCount = Array.isArray(payload.data?.data) ? payload.data.data.length : 0;
      setStatus(`AI endpoint reachable. ${modelCount} model${modelCount === 1 ? "" : "s"} reported.`);
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-md bg-white p-5 shadow-line">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">AI base URL</span>
          <input
            value={form.aiBaseUrl}
            onChange={(event) => update("aiBaseUrl", event.target.value)}
            className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">AI model</span>
          <input
            value={form.aiModel}
            onChange={(event) => update("aiModel", event.target.value)}
            className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Timezone</span>
          <input
            value={form.timezone}
            onChange={(event) => update("timezone", event.target.value)}
            className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-sm font-medium">Lunch servings</span>
            <input
              type="number"
              min={1}
              max={12}
              value={form.defaultLunchServings}
              onChange={(event) => update("defaultLunchServings", Number(event.target.value))}
              className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Dinner servings</span>
            <input
              type="number"
              min={1}
              max={12}
              value={form.defaultDinnerServings}
              onChange={(event) => update("defaultDinnerServings", Number(event.target.value))}
              className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2"
            />
          </label>
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Planning preferences</span>
        <textarea
          value={form.planningPreferences}
          onChange={(event) => update("planningPreferences", event.target.value)}
          rows={4}
          className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Variety rules</span>
        <textarea
          value={form.planningVarietyRules}
          onChange={(event) => update("planningVarietyRules", event.target.value)}
          rows={3}
          className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Pantry staples, one per line</span>
        <textarea
          value={form.pantryStaples}
          onChange={(event) => update("pantryStaples", event.target.value)}
          rows={7}
          className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white"
        >
          <Save size={16} aria-hidden="true" />
          Save
        </button>
        <button
          type="button"
          onClick={testAi}
          disabled={busy}
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-ink/15 px-4 py-2 text-sm font-medium"
        >
          <PlugZap size={16} aria-hidden="true" />
          Test AI
        </button>
      </div>
      {status ? <p className="text-sm text-ink/70">{status}</p> : null}
    </div>
  );
}
