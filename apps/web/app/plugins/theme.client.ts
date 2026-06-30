import { useThemeStore } from "~/stores/theme";

export default defineNuxtPlugin(() => {
  useThemeStore().initialize();
});
