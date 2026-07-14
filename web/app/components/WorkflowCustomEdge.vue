<script setup>
import { BezierEdge } from '@vue-flow/core';

const { getEdgeParentSvg } = useWorkflow();

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: '',
  },
  sourceX: {
    type: Number,
    required: true,
  },
  sourceY: {
    type: Number,
    required: true,
  },
  targetX: {
    type: Number,
    required: true,
  },
  targetY: {
    type: Number,
    required: true,
  },
});

const bezierEdgeRef = ref(null);

onMounted(async () => {
  await nextTick();

  const MAX_RETRIES = 5;
  const RETRY_INTERVAL = 100;
  let retryCount = 0;

  // BezierEdge may not be immediately available in the DOM.
  const tryFindBezierEdge = () => {
    const bezierEdge = bezierEdgeRef.value;
    if (!bezierEdge) {
      if (++retryCount < MAX_RETRIES) {
        setTimeout(tryFindBezierEdge, RETRY_INTERVAL);
      }
      return;
    }
    const markerEndUrl = bezierEdge.markerEnd;
    const markerElement = elementUtils.getMarkerByUrl(markerEndUrl);
    markerElement.classList.add(props.type);
    // Prevent marker from being scaled
    markerElement.setAttribute('markerUnits', 'userSpaceOnUse');
    const svg = getEdgeParentSvg(props.id);
    if (!svg) return;
    svg.classList.add(props.type);
  };

  tryFindBezierEdge();
});
</script>

<template>
  <WorkflowRightAngleEdge
    v-if="props.sourceX > props.targetX"
    v-bind="props"
    :id="props.id"
    :start-point="{ x: props.sourceX, y: props.sourceY }"
    :end-point="{ x: props.targetX, y: props.targetY }"
  />
  <BezierEdge
    v-else
    v-bind="props"
    ref="bezierEdgeRef"
  />
</template>
