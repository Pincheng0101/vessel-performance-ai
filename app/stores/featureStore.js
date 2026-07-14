import { defineStore } from 'pinia';

export const useFeatureStore = defineStore('feature', () => {
  const features = ref([]);

  const setFeatures = (v) => {
    features.value = v;
  };

  const isFeatureDisabled = (featureName) => {
    const feature = features.value.find(f => f.name === featureName);
    return !feature || !feature.enabled;
  };

  return {
    features,
    isFeatureDisabled,
    setFeatures,
  };
});
