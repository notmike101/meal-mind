<template>
  <div class="mm-app-shell min-h-screen mm-scaled">
    <AppHeader />
    <main class="min-w-0 px-4 py-8 sm:px-8 sm:py-10 lg:px-8 lg:py-12 xl:px-10">
      <div class="mm-page mx-auto max-w-[96rem]">
        <slot />
      </div>
    </main>
  </div>
</template>
