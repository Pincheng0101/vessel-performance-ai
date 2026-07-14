import { KeyboardConstant } from '~/constants';

const { DefaultModifier } = KeyboardConstant;

export default function useKeyboardShortcuts() {
  const normalizeKey = key => key.toLowerCase();
  const isModifierKey = key => Object.values(DefaultModifier).some(m => normalizeKey(m.title) === normalizeKey(key));

  const isModifierMatch = (event, modifierKeys = []) => {
    const expected = modifierKeys.map(normalizeKey);
    const actual = Object.values(DefaultModifier).filter(m => event[m.value] === true).map(m => normalizeKey(m.title));
    return arrUtils.isEqualUnordered(expected, actual);
  };

  const registerKeyboardShortcuts = (shortcuts) => {
    if (!shortcuts) return;
    shortcuts.forEach(({ bindings = [], enabled = true, callback = () => { } }) => {
      bindings.forEach((binding) => {
        const normalizedKeys = binding.map(normalizeKey);
        const modifierKeys = normalizedKeys.filter(isModifierKey);
        const triggerKeys = normalizedKeys.filter(k => !isModifierKey(k));
        triggerKeys.forEach((key) => {
          onKeyStroke(key, (event) => {
            if (!toValue(enabled)) return;
            if (!isModifierMatch(event, modifierKeys)) return;
            event.preventDefault();
            callback(event);
          });
        });
      });
    });
  };

  return {
    registerKeyboardShortcuts,
  };
}
