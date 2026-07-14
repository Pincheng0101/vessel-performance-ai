<script setup>
import { LlmConstant, ResourceConstant } from '~/constants';
import { MultiRequestResourceQuery } from '~/models/server/multiRequest';

/**
 * @import { Agent } from '~/models/server/agent'
 */

/**
 * @type {{ agent: Agent }}
 */
const props = defineProps({
  agent: {
    type: Object,
    required: true,
  },
  notice: {
    type: String,
    default: '',
  },
});

const selectedLlmId = defineModel('selectedLlmId', {
  type: String,
  default: null,
});

const server = useServer();

const state = reactive({
  primaryLlm: null,
  llms: [],
  isLoading: false,
});

const getLlmIconPath = llm => findField(LlmConstant.Type, llm?.type, 'iconPath');
const getLlmModelTitle = llm => findField(LlmConstant.Model, llm?.model, 'title') || llm?.model || '';

const effectiveLlm = computed(() => {
  return state.llms.find(item => item.id === selectedLlmId.value) || state.primaryLlm;
});

const fetchLlms = async () => {
  const llmIds = arrUtils.deduplicate([props.agent?.llmId, ...(props.agent?.llmIds || [])]);

  state.primaryLlm = null;
  state.llms = [];
  if (llmIds.length < 1) return;

  state.isLoading = true;
  try {
    const queries = llmIds.map(id => new MultiRequestResourceQuery({
      id,
      type: ResourceConstant.Type.LLM.value,
    }));
    const { data } = await server.multiRequest.get(queries, { lazy: false });
    const llms = Object.values(data.value?.llms || {});
    const llmMap = llms.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});

    state.primaryLlm = llmMap[props.agent?.llmId] || null;
    state.llms = (props.agent?.llmIds || [])
      .map(id => llmMap[id])
      .filter(Boolean);
  } finally {
    state.isLoading = false;
  }
};

const handleSelect = (llmId) => {
  selectedLlmId.value = llmId;
};

watch(() => props.agent, fetchLlms, { deep: true, immediate: true });

watch(() => props.agent?.llmIds, (after) => {
  if (!after?.includes(selectedLlmId.value)) {
    selectedLlmId.value = null;
  }
}, { deep: true });
</script>

<template>
  <v-menu>
    <template #activator="{ props: p, isActive }">
      <v-fade-transition mode="out-in">
        <template v-if="state.primaryLlm && state.llms.length > 0">
          <v-chip
            v-bind="p"
            class="bg-background"
            color="primaryLight"
            variant="text"
          >
            <div class="d-flex ga-1 align-center">
              <AppImageIcon
                :src="getLlmIconPath(effectiveLlm)"
                :width="14"
                :height="14"
              />
              {{ effectiveLlm.name }}
              <v-icon
                v-if="state.isLoading"
                icon="mdi-loading"
                class="mdi-spin"
              />
              <v-icon
                v-else
                :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              />
            </div>
          </v-chip>
        </template>
      </v-fade-transition>
    </template>
    <v-card
      :elevation="1"
      rounded="lg"
    >
      <template v-if="props.notice">
        <v-sheet
          color="transparent"
          :height="52"
          class="d-flex align-center ga-2 px-4"
        >
          <v-icon
            icon="mdi-information-outline"
            color="primary"
          />
          {{ props.notice }}
        </v-sheet>
        <v-divider />
      </template>
      <v-list
        density="compact"
        class="py-0"
      >
        <template
          v-for="item in state.llms"
          :key="item.id"
        >
          <v-list-item
            :active="selectedLlmId === item.id"
            :title="item.name"
            :subtitle="getLlmModelTitle(item)"
            class="text-body-2"
            @click="handleSelect(item.id)"
          >
            <template #prepend>
              <AppImageIcon :src="getLlmIconPath(item)" />
            </template>
          </v-list-item>
        </template>
      </v-list>
    </v-card>
  </v-menu>
</template>
