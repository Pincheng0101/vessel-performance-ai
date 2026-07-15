import type { Dayjs } from 'dayjs';

declare module '#app' {
  interface NuxtApp {
    $dayjs: Dayjs;
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $dayjs: Dayjs;
  }
}

export {};
