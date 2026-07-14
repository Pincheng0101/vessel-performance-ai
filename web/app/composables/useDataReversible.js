export default function useDataReversible() {
  const undoStack = ref([]);
  const redoStack = ref([]);
  const previousData = ref('');

  const isUndoDisabled = computed(() => undoStack.value.length === 0);
  const isRedoDisabled = computed(() => redoStack.value.length === 0);

  const update = useDebounceFn((previous, currentData = '') => {
    undoStack.value.push(previous);
    redoStack.value = [];
    previousData.value = currentData;
  }, 1000);

  const undo = (currentData) => {
    if (undoStack.value.length === 0) return;
    const item = undoStack.value.pop();
    redoStack.value.push(currentData);
    previousData.value = item;
    return item;
  };

  const redo = (currentData) => {
    if (redoStack.value.length === 0) return;
    const item = redoStack.value.pop();
    undoStack.value.push(currentData);
    previousData.value = item;
    return item;
  };

  const reset = () => {
    undoStack.value = [];
    redoStack.value = [];
  };

  return {
    isRedoDisabled,
    isUndoDisabled,
    previousData,
    redo,
    redoStack,
    reset,
    undo,
    undoStack,
    update,
  };
}
