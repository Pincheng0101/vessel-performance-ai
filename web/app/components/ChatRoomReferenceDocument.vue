<script setup>
const props = defineProps({
  knowledgeBaseId: {
    type: String,
    required: true,
  },
  docId: {
    type: String,
    required: true,
  },
});

const server = useServer();

const { data: document, pending } = await server.knowledgeBase.getDocument({
  docId: props.docId,
  knowledgeBaseId: props.knowledgeBaseId,
});
</script>

<template>
  <v-sheet color="transparent">
    <template v-if="pending">
      <v-sheet
        color="transparent"
        class="d-flex align-center justify-center"
      >
        <AppSkeletonLoader type="paragraph@3" />
      </v-sheet>
    </template>
    <template v-else-if="document">
      <AppDisplayFieldGroup :items="document.displayFields" />
    </template>
  </v-sheet>
</template>
