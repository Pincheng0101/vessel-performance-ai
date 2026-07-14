import type { FormValidator } from '@kklab/fortress-validator';
import type { Dayjs } from 'dayjs';

declare module '#app' {
  interface NuxtApp {
    $validator: FormValidator;
    $dayjs: Dayjs;
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $validator: FormValidator;
    $dayjs: Dayjs;
  }
}

export {};
