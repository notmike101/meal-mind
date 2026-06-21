"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, RefreshCw } from "lucide-react";

export function CommitPlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/plans/${planId}/commit`, { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message ?? "Could not commit plan.");
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
        onClick={commit}
        disabled={busy}
        className="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90"
      >
        {busy ? <RefreshCw size={16} className="animate-spin" aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
        {busy ? "Committing" : "Commit plan"}
      </button>
      {error ? <p className="text-sm text-tomato">{error}</p> : null}
    </div>
  );
}
