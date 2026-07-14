<script setup>
import { LocaleConstant } from '~/constants';

const { setLocale } = useCustomLocale();

const locales = Object.values(LocaleConstant.Base);
</script>

<template>
  <AppIconButton
    icon="mdi-web"
    size="small"
    variant="text"
    aria-label="Switch Locale"
  >
    <template #menu>
      <v-menu activator="parent">
        <v-card
          :elevation="1"
          rounded="lg"
        >
          <v-list
            density="compact"
            class="py-0"
          >
            <template
              v-for="(locale, i) in locales"
              :key="i"
            >
              <v-list-item
                :aria-label="locale.text"
                class="text-body-2"
                @click="() => setLocale(locale.value)"
              >
                {{ locale.text }}
              </v-list-item>
            </template>
          </v-list>
        </v-card>
      </v-menu>
    </template>
  </AppIconButton>
</template>
