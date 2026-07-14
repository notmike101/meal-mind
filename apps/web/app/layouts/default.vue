<template>
  <div class="mm-app-shell min-h-screen mm-scaled">
    <AppHeader />
    <main class="min-w-0 px-4 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 xl:px-14">
      <div class="mm-page mx-auto max-w-[86rem]">
        <slot />
      </div>
    </main>
  </div>
</template>
