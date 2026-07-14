<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  persistent: {
    type: Boolean,
    default: false,
  },
  buttonSize: {
    type: Number,
    default: 32,
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});
</script>

<template>
  <div>
    <v-menu
      v-model="model"
      :offset="4"
      :close-on-content-click="false"
    >
      <template #activator="{ props: p }">
        <AppIconButton
          v-bind="p"
          :size="props.buttonSize"
          icon-size="small"
          icon="mdi-dots-horizontal"
          variant="text"
          :class="{
            isHidden: !props.persistent && !model,
          }"
        />
      </template>
      <v-card
        :elevation="1"
        :min-width="160"
        rounded="lg"
      >
        <v-list
          density="compact"
          class="py-0"
        >
          <template
            v-for="item in props.items"
            :key="item.title"
          >
            <v-list-item
              :disabled="item.disabled"
              class="text-body-2"
              @click="item.callback"
            >
              <template #prepend>
                <v-icon
                  :icon="item.icon"
                  size="small"
                  :color="item.color || 'text'"
                />
              </template>
              <template v-if="item.loading">
                <AppProgressCircular
                  :size="20"
                  :width="2"
                />
              </template>
              <template v-else>
                <span :class="[`text-${item.color || 'text'}`]">
                  {{ item.title }}
                </span>
              </template>
            </v-list-item>
          </template>
        </v-list>
      </v-card>
    </v-menu>
    <slot name="dialog" />
  </div>
</template>

<style lang="scss" scoped>
.isHidden {
  visibility: hidden;
}
</style>
