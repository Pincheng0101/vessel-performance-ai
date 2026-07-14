<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  activeHash: {
    type: String,
    default: '',
  },
  onClick: {
    type: Function,
    default: () => {},
  },
});

const isActive = item => item.href === props.activeHash;
const isExpanded = item => isActive(item) || item.children.some(isExpanded);
</script>

<template>
  <ul v-if="props.items.length > 0">
    <li
      v-for="(item, i) in props.items"
      :key="i"
      class="text-truncate pl-3"
      :class="{
        active: isActive(item),
        expanded: isExpanded(item),
      }"
    >
      <a
        :href="item.href"
        class="text-truncate text-decoration-none"
        @click.prevent="props.onClick(item.href)"
      >
        {{ item.text }}
      </a>
      <AppMarkdownViewerTocItem
        :items="item.children"
        :active-hash="props.activeHash"
        :on-click="props.onClick"
      />
    </li>
  </ul>
</template>

<style lang="scss" scoped>
ul {
  padding-inline-start: 0;
}
li {
  position: relative;
  &::before {
    background-color: rgba(var(--v-theme-primary));
    content: '';
    height: 0;
    left: 0;
    position: absolute;
    top: 0;
    width: 3px;
  }
  ul li::before {
    display: none;
  }
  &.expanded::before {
    height: 100%;
  }
  &:not(.expanded):hover::before {
    height: 100%;
    opacity: 0.5;
    width: 2px;
  }
  &:not(.expanded) ul {
    display: none;
  }
}
a {
  color: rgba(var(--v-theme-text), 0.75);
  display: block;
  line-height: 1.5;
  padding: 4px 0;
  transition: color 0.25s;
  @at-root li.active > & {
    color: rgba(var(--v-theme-primary));
  }
  &:hover {
    color: rgba(var(--v-theme-primary));
  }
}
</style>
