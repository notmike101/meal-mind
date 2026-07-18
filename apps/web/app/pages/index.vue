<script setup lang="ts">
import { navigateTo } from "#imports";
import { createError } from "h3";
import { usePlanningStore } from "~/stores/planning";
import { selectDefaultWeek, workspaceLocation } from "~/utils/plan-workspace";

const planning = usePlanningStore();
await Promise.all([planning.fetchState(), planning.fetchPlanSummaries()]);
if (!planning.currentWeek) throw createError({ statusCode: 503, statusMessage: "Planning state is unavailable." });

await navigateTo(
  workspaceLocation(selectDefaultWeek(planning.currentWeek, planning.planSummaries), "plan"),
  { replace: true, redirectCode: 302 },
);
</script>

<template>
  <div />
</template>
