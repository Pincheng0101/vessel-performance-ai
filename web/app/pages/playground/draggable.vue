<script setup>
import { VueDraggable } from 'vue-draggable-plus';

definePageMeta({
  layout: 'fluid',
});

const state = reactive({
  isDragging: false,
  items: [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ],
});
</script>

<template>
  <ResourceInfoTitle
    title="Draggable"
    class="mb-4"
  />
  <v-row>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldInput')">
        <template #body>
          <AppInputGroup :label="$t('__fieldInput')">
            <v-card
              border
              flat
            >
              <v-data-table
                :items="state.items"
                hide-default-footer
              >
                <VueDraggable
                  v-model="state.items"
                  :animation="250"
                  :disabled="false"
                  handle=".handle"
                  tag="tbody"
                  @start="state.isDragging = true"
                  @end="state.isDragging = false"
                >
                  <template
                    v-for="item in state.items"
                    :key="item.id"
                  >
                    <tr>
                      <td :width="20">
                        <v-icon
                          icon="mdi-drag-vertical"
                          color="backgroundScale4"
                          :class="['handle', state.isDragging ? 'cursor-grabbing' : 'cursor-grab']"
                        />
                      </td>
                      <td>{{ item.name }}</td>
                    </tr>
                  </template>
                </VueDraggable>
              </v-data-table>
            </v-card>
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldOutput')">
        <template #body>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldOutput')"
          >
            <AppJsonEditor
              :id="id"
              v-model:object="state.items"
              fill-height
            />
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>

<style lang="scss" scoped>
:deep(.v-table) {
  th, td {
    background-color: rgba(var(--v-theme-backgroundScale2)) !important;
  }
}
</style>
