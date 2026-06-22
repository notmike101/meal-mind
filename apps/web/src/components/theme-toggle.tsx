"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const storageKey = "mealmind-theme";
const preferences: Array<{ value: ThemePreference; label: string; icon: typeof Monitor }> = [
  { value: "system", label: "Use system theme", icon: Monitor },
  { value: "light", label: "Use light theme", icon: Sun },
  { value: "dark", label: "Use dark theme", icon: Moon },
];

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(storageKey);
  return isThemePreference(stored) ? stored : "system";
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.theme = preference === "system" ? getSystemTheme() : preference;
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(getStoredPreference);

  useEffect(() => {
    applyTheme(preference);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handleSystemThemeChange() {
      if (preference === "system") {
        applyTheme("system");
      }
    }

    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, [preference]);

  function updatePreference(nextPreference: ThemePreference) {
    window.localStorage.setItem(storageKey, nextPreference);
    setPreference(nextPreference);
    applyTheme(nextPreference);
  }

  return (
    <div className="flex h-10 items-center rounded-md border border-ink/10 bg-field p-1" aria-label="Theme preference">
      {preferences.map((item) => {
        const Icon = item.icon;
        const active = preference === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-label={item.label}
            aria-pressed={active}
            title={item.label}
            onClick={() => updatePreference(item.value)}
            className={
              active
                ? "focus-ring flex h-8 w-8 items-center justify-center rounded-md bg-surface text-ink shadow-line"
                : "focus-ring flex h-8 w-8 items-center justify-center rounded-md text-ink/60 hover:bg-surface hover:text-ink"
            }
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
