<template>
  <div class="mm-app-shell">
    <a href="#main-content" class="focus-ring mm-skip-link">Skip to content</a>
    <AppHeader />
    <main id="main-content" tabindex="-1" class="mm-shell-main">
      <div class="mm-page mm-shell-container">
        <slot />
      </div>
    </main>
  </div>
</template>
