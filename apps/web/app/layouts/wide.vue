<template>
  <div class="mm-app-shell min-h-screen">
    <AppHeader />
    <main class="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-6 lg:py-10 xl:px-8 xl:py-12 2xl:px-10">
      <div class="mm-page mx-auto max-w-[94rem]">
        <slot />
      </div>
    </main>
  </div>
</template>
