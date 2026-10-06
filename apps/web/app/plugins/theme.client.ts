import { onNuxtReady } from "#imports";
import { useThemeStore } from "~/stores/theme";

export default defineNuxtPlugin(() => {
  const theme = useThemeStore();
  // Async pages can still hydrate after app:mounted; keep their SSR preference until Nuxt is ready.
  onNuxtReady(() => {
    theme.initialize();
  });
});
