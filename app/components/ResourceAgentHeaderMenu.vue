<script setup>
import { ResourceConstant } from '~/constants';

const { t } = useI18n();

const model = defineModel({
  type: Boolean,
  default: false,
});

const items = computed(() => [
  {
    title: t(ResourceConstant.AgentCreateMode.FROM_BLANK.i18nTitle),
    value: ResourceConstant.AgentCreateMode.FROM_BLANK.value,
    icon: ResourceConstant.AgentCreateMode.FROM_BLANK.icon,
    callback: () => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value)}/create`),
  },
  {
    title: t(ResourceConstant.AgentCreateMode.FROM_AGENT_BUILDER.i18nTitle),
    value: ResourceConstant.AgentCreateMode.FROM_AGENT_BUILDER.value,
    icon: ResourceConstant.AgentCreateMode.FROM_AGENT_BUILDER.icon,
    callback: () => navigateTo('/quick-start/agents/create'),
  },
]);

const closeMenu = () => {
  model.value = false;
};

const handleClick = async (item) => {
  await item.callback();
  closeMenu();
};
</script>

<template>
  <v-menu
    v-model="model"
    :close-on-content-click="false"
    :offset="4"
  >
    <template #activator="{ props }">
      <AppIconButton
        v-bind="props"
        icon="mdi-plus"
        class="primary-gradient"
      />
    </template>
    <v-card
      :elevation="1"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <v-list-item
          v-for="item in items"
          :key="item.value"
          class="text-body-2"
          @click="() => handleClick(item)"
        >
          <template #prepend>
            <v-icon
              :icon="item.icon"
              size="small"
              color="primary"
            />
          </template>
          {{ item.title }}
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>
