const DefaultModifier = Object.freeze({
  CTRL: {
    title: 'Ctrl',
    value: 'ctrlKey',
  },
  META: {
    title: 'Meta',
    value: 'metaKey',
  },
  SHIFT: {
    title: 'Shift',
    value: 'shiftKey',
  },
  ALT: {
    title: 'Alt',
    value: 'altKey',
  },
});

const KEYS = Object.freeze({
  D: {
    title: 'D',
    value: 'd',
  },
  Z: {
    title: 'Z',
    value: 'z',
  },
});

const MacBindings = Object.freeze({
  DUPLICATE: {
    value: [
      DefaultModifier.META.title,
      KEYS.D.title,
    ],
  },
  UNDO: {
    value: [
      DefaultModifier.META.title,
      KEYS.Z.title,
    ],
  },
  REDO: {
    value: [
      DefaultModifier.META.title,
      DefaultModifier.SHIFT.title,
      KEYS.Z.title,
    ],
  },
});

const WindowsBindings = Object.freeze({
  DUPLICATE: {
    value: [
      DefaultModifier.CTRL.title,
      KEYS.D.title,
    ],
  },
  UNDO: {
    value: [
      DefaultModifier.CTRL.title,
      KEYS.Z.title,
    ],
  },
  REDO: {
    value: [
      DefaultModifier.CTRL.title,
      DefaultModifier.SHIFT.title,
      KEYS.Z.title,
    ],
  },
});

const Bindings = Object.freeze({
  DUPLICATE: {
    value: [
      MacBindings.DUPLICATE.value,
      WindowsBindings.DUPLICATE.value,
    ],
  },
  UNDO: {
    value: [
      MacBindings.UNDO.value,
      WindowsBindings.UNDO.value,
    ],
  },
  REDO: {
    value: [
      MacBindings.REDO.value,
      WindowsBindings.REDO.value,
    ],
  },
});

export {
  Bindings,
  DefaultModifier,
  MacBindings,
  WindowsBindings,
};
