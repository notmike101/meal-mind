"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

type GeneratePlanButtonProps = {
  replaceExisting?: boolean;
  label?: string;
};

export function GeneratePlanButton({ replaceExisting = false, label }: GeneratePlanButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      if (replaceExisting && !window.confirm("Replace the existing draft plan for next week?")) {
        return;
      }
      const response = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replaceExisting }),
      });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message ?? "Could not generate plan.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="focus-ring inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white hover:bg-moss/90"
      >
        {busy ? <RefreshCw size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
        {busy ? "Generating" : label ?? (replaceExisting ? "Replace draft" : "Generate next week")}
      </button>
      {error ? <p className="max-w-xl text-sm text-tomato">{error}</p> : null}
    </div>
  );
}
