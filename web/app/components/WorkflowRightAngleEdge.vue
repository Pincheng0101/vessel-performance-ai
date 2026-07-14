<script setup>
import { useVueFlow } from '@vue-flow/core';
import { WorkflowConstant } from '~/constants';

const { findEdge } = useVueFlow();

const {
  getEdgeParentSvg,
  getRightAngleEdgeYDistance,
} = useWorkflow();

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: '',
  },
  startPoint: {
    type: Object,
    required: true,
  },
  endPoint: {
    type: Object,
    required: true,
  },
});

const BORDER_RADIUS = 8;
const OFFSET = WorkflowConstant.Dimension.NODE_HORIZONTAL_SPACING / 2;

const edge = computed(() => findEdge(props.id));

const markerEndUrl = computed(() => `url('#vue-flow-0__height=20&id=${edge.value.markerEnd.id}&type=arrowclosed&width=20')`);

const pathData = computed(() => {
  const { x: startX, y: startY } = props.startPoint;
  const { x: endX, y: endY } = props.endPoint;
  if (startX <= endX) return '';

  const yDistance = getRightAngleEdgeYDistance({
    edge: edge.value,
    startY,
  });
  const downY = startY + yDistance;

  // Generate Bezier curve path
  const turningPoint1 = {
    x: startX + OFFSET,
    y: startY,
  };
  const turningPoint2 = {
    x: startX + OFFSET,
    y: downY + OFFSET,
  };
  const isTurningPoint2Down = turningPoint2.y > turningPoint1.y;
  const turningPoint3 = {
    x: endX - OFFSET,
    y: downY + OFFSET,
  };
  const isTurningPoint3Right = turningPoint3.x > turningPoint2.x;
  const turningPoint4 = {
    x: endX - OFFSET,
    y: endY,
  };
  const isTurningPoint4Down = turningPoint4.y > turningPoint3.y;
  return `
    M ${startX},${startY}
    Q ${turningPoint1.x},${turningPoint1.y},${turningPoint1.x - BORDER_RADIUS},${turningPoint1.y}
    Q ${turningPoint1.x},${turningPoint1.y},${turningPoint1.x},${turningPoint1.y + BORDER_RADIUS * (isTurningPoint2Down ? 1 : -1)}
    Q ${turningPoint2.x},${turningPoint2.y},${turningPoint2.x},${turningPoint2.y + BORDER_RADIUS * (isTurningPoint2Down ? -1 : 1)}
    Q ${turningPoint2.x},${turningPoint2.y},${turningPoint2.x + BORDER_RADIUS * (isTurningPoint3Right ? 1 : -1)},${turningPoint2.y}
    Q ${turningPoint3.x},${turningPoint3.y},${turningPoint3.x + BORDER_RADIUS * (isTurningPoint3Right ? -1 : 1)},${turningPoint3.y}
    Q ${turningPoint3.x},${turningPoint3.y},${turningPoint3.x},${turningPoint3.y + BORDER_RADIUS * (isTurningPoint4Down ? 1 : -1)}
    Q ${turningPoint4.x},${turningPoint4.y},${turningPoint4.x},${turningPoint4.y + BORDER_RADIUS * (isTurningPoint4Down ? -1 : 1)}
    Q ${turningPoint4.x},${turningPoint4.y},${turningPoint4.x + BORDER_RADIUS},${turningPoint4.y}
    L ${endX},${endY}
  `;
});

onMounted(async () => {
  await nextTick();

  const MAX_RETRIES = 5;
  const RETRY_INTERVAL = 100;
  let retryCount = 0;

  // Marker in <svg> <defs> may not be immediately available in the DOM.
  const tryFindMarker = () => {
    const markerElement = elementUtils.getMarkerByUrl(markerEndUrl.value);
    if (!markerElement) {
      if (++retryCount < MAX_RETRIES) {
        setTimeout(tryFindMarker, RETRY_INTERVAL);
      }
      return;
    }
    markerElement.classList.add(props.type);
    // Prevent marker from being scaled
    markerElement.setAttribute('markerUnits', 'userSpaceOnUse');
    const svg = getEdgeParentSvg(props.id);
    if (!svg) return;
    svg.classList.add(props.type);
  };

  tryFindMarker();
});
</script>

<template v-if="pathData">
  <svg class="vue-flow__edges vue-flow__container">
    <path
      :d="pathData"
      class="vue-flow__edge-path"
      :marker-end="markerEndUrl"
      stroke-width="1"
    />
  </svg>
</template>
