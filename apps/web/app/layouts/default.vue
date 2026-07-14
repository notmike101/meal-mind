<template>
  <div class="mm-app-shell min-h-screen mm-scaled">
    <AppHeader />
    <main class="mm-shell-container px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
      <div class="mm-page">
        <slot />
      </div>
    </main>
  </div>
</template>
