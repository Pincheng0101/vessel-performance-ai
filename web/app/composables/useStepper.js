import { StatusConstant } from '~/constants';

/**
 * @import { Step } from '~/models/ui/stepper';
 */

/**
 * @param {Step[]} stepperConfig
 */
export const useStepper = (stepperConfig) => {
  const state = reactive({
    statusMap: {},
  });

  const collectProgressBoardItems = (steps) => {
    const items = [];
    (steps || []).forEach((step) => {
      const stepItems = step?.progressBoardItems || [];
      stepItems.forEach((item) => {
        if (!item?.key) return;
        items.push(item);
      });
    });
    return items;
  };

  const initStatusMap = (items) => {
    (items || []).forEach((item) => {
      const key = item.key;
      if (state.statusMap[key] === undefined) {
        state.statusMap[key] = StatusConstant.Runtime.NOT_STARTED.value;
      }
    });
  };

  const progressBoardItemMap = computed(() => {
    const steps = unref(stepperConfig) || [];
    const collectedItems = collectProgressBoardItems(steps);

    initStatusMap(collectedItems);

    const map = new Map();

    for (const item of collectedItems) {
      const key = item.key;
      if (!map.has(key)) {
        map.set(key, item);
      }
    }

    return map;
  });

  const getProgressBoardItemsByKeys = (keys = []) => {
    return keys
      .map(k => progressBoardItemMap.value.get(k))
      .filter(Boolean);
  };

  const steps = computed(() => {
    const defs = unref(stepperConfig) || [];

    return defs.map((step) => {
      const originalItems = step?.progressBoardItems || [];
      const keys = originalItems.map(i => i?.key).filter(Boolean);

      const normalizedItems = keys.length
        ? getProgressBoardItemsByKeys(keys)
        : [];

      normalizedItems.forEach((item) => {
        item.status = state.statusMap[item.key];
      });

      step.progressBoardItems = normalizedItems;

      return step;
    });
  });

  const setStatus = (key, status) => {
    state.statusMap[key] = status;
  };

  const setStatusProcessing = (key) => {
    setStatus(key, StatusConstant.Runtime.PROCESSING.value);
  };

  const setStatusSucceeded = (key) => {
    setStatus(key, StatusConstant.Runtime.SUCCEEDED.value);
  };

  const setStatusFailed = (key) => {
    setStatus(key, StatusConstant.Runtime.FAILED.value);
  };

  const setStatusCanceled = (key) => {
    setStatus(key, StatusConstant.Runtime.CANCELED.value);
  };

  return {
    steps,
    setStatusCanceled,
    setStatusFailed,
    setStatusProcessing,
    setStatusSucceeded,
  };
};
