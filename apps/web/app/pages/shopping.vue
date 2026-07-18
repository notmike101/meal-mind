<script setup lang="ts">
import { navigateTo, useRoute } from "#imports";
import { createError } from "h3";
import { usePlanningStore } from "~/stores/planning";
import { normalizeWeekStart } from "~/utils/dates";
import { selectDefaultWeek, workspaceLocation } from "~/utils/plan-workspace";

const route = useRoute();
const planning = usePlanningStore();
await Promise.all([planning.fetchState(), planning.fetchPlanSummaries()]);
if (!planning.currentWeek) throw createError({ statusCode: 503, statusMessage: "Planning state is unavailable." });

const requestedWeek = normalizeWeekStart(Array.isArray(route.query.week) ? route.query.week[0] : route.query.week);
const week = requestedWeek ?? selectDefaultWeek(planning.currentWeek, planning.planSummaries);
await navigateTo(workspaceLocation(week, "shopping"), { replace: true, redirectCode: 302 });
</script>

<template>
  <div />
</template>
