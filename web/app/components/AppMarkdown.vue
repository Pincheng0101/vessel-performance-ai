<script setup>
import highlight from '~/utils/highlight';

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  inline: {
    type: Boolean,
    default: false,
  },
  enableAnchors: {
    type: Boolean,
    default: false,
  },
  anchorPrefix: {
    type: String,
    default: '',
  },
  generateToc: {
    type: Boolean,
    default: false,
  },
  slotInjector: {
    type: Function,
    default: null,
  },
});

const container = ref(null);
const html = ref('');
const vueSlots = shallowRef([]);

watchEffect(async () => {
  const base = markdownUtils.toHtml(props.text, {
    enableAnchors: props.enableAnchors,
    anchorPrefix: props.anchorPrefix,
    generateToc: props.generateToc,
    hideFrontmatter: props.inline,
  });
  if (!props.slotInjector) {
    html.value = base;
    vueSlots.value = [];
    return;
  }
  const { html: processed, slots } = props.slotInjector(base);
  html.value = processed;
  vueSlots.value = [];
  await nextTick();
  vueSlots.value = slots;
});

const highlightTableCodeBlocks = () => {
  const codeBlocks = container.value.querySelectorAll('table td pre code');
  codeBlocks.forEach((codeBlock) => {
    const pre = codeBlock.closest('pre');
    const td = codeBlock.closest('td');
    highlight.highlightElement(codeBlock);
    if (!pre || !td) return;
    pre.style.height = `${td.offsetHeight}px`;
  });
};

const syncTableCodeBlockHeights = () => {
  const observer = new ResizeObserver((entries) => {
    requestAnimationFrame(() => {
      entries.forEach(({ target }) => {
        const height = target.offsetHeight;
        target.closest('tr').querySelectorAll('pre').forEach((pre) => {
          if (pre === target) return;
          if (pre.offsetHeight === height) return;
          pre.style.height = `${height}px`;
        });
      });
    });
  });
  container.value.querySelectorAll('table td pre').forEach(pre => observer.observe(pre));
};

onMounted(() => {
  highlightTableCodeBlocks();
  syncTableCodeBlockHeights();
});
</script>

<template>
  <div
    ref="container"
    :class="{
      markdown: true,
      inline: props.inline,
    }"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="html" />
    <Teleport
      v-for="slot in vueSlots"
      :key="slot.id"
      :to="`#${slot.id}`"
    >
      <component
        :is="slot.component"
        v-bind="slot.props"
      />
    </Teleport>
  </div>
</template>
