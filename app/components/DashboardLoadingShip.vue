<script setup>
// Suspense fallback for the dashboard tabs — a small CSS/SVG animation (ship bobbing on a
// scrolling wave) instead of a generic skeleton box, since every tab fetches its own data on
// first open and this is what's shown while that's in flight.
</script>

<template>
  <div class="ship-loader">
    <svg
      class="ship-loader-svg"
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="載入中"
    >
      <g class="wave wave--back">
        <path d="M0,110 Q25,95 50,110 T100,110 T150,110 T200,110 T250,110 T300,110 T350,110 T400,110 V200 H0 Z" />
        <path
          d="M0,110 Q25,95 50,110 T100,110 T150,110 T200,110 T250,110 T300,110 T350,110 T400,110 V200 H0 Z"
          transform="translate(400, 0)"
        />
      </g>

      <g class="ship">
        <path
          class="ship-hull"
          d="M155,118 L245,118 L232,138 L168,138 Z"
        />
        <rect
          class="ship-cabin"
          x="185"
          y="104"
          width="22"
          height="16"
          rx="2"
        />
        <line
          class="ship-mast"
          x1="200"
          y1="60"
          x2="200"
          y2="106"
        />
        <path
          class="ship-sail"
          d="M201,62 L201,102 L232,102 Z"
        />
      </g>

      <g class="wave wave--front">
        <path d="M0,124 Q20,138 40,124 T80,124 T120,124 T160,124 T200,124 T240,124 T280,124 T320,124 T360,124 T400,124 V200 H0 Z" />
        <path
          d="M0,124 Q20,138 40,124 T80,124 T120,124 T160,124 T200,124 T240,124 T280,124 T320,124 T360,124 T400,124 V200 H0 Z"
          transform="translate(400, 0)"
        />
      </g>
    </svg>
    <div class="ship-loader-caption text-caption text-medium-emphasis">
      載入中…
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ship-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 220px;
  overflow: hidden;
  border: 1px dashed rgb(var(--v-border-color));
  border-radius: 8px;
}

.ship-loader-svg {
  width: 100%;
  max-width: 320px;
  height: auto;
}

.wave path {
  fill: rgba(var(--v-theme-primary), 0.16);
}

.wave--front path {
  fill: rgba(var(--v-theme-primary), 0.3);
}

.wave--back {
  animation: wave-scroll 7s linear infinite;
}

.wave--front {
  animation: wave-scroll 4s linear infinite;
}

.ship {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: ship-bob 2.6s ease-in-out infinite;
}

.ship-hull {
  fill: rgb(var(--v-theme-primary));
}

.ship-cabin,
.ship-sail {
  fill: rgb(var(--v-theme-backgroundScale2));
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 1.5;
}

.ship-mast {
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2;
}

@keyframes wave-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-400px);
  }
}

@keyframes ship-bob {
  0%,
  100% {
    transform: translateY(0) rotate(-2deg);
  }
  50% {
    transform: translateY(-6px) rotate(2deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wave,
  .ship {
    animation: none;
  }
}
</style>
