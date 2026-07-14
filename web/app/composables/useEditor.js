import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';

export default function useEditor() {
  const setHighlightedBlockEffect = StateEffect.define();
  const clearHighlightedBlockEffect = StateEffect.define();

  const highlightedStateField = StateField.define({
    create() {
      return Decoration.none;
    },
    update(decorations, tr) {
      const effect = tr.effects.find(effect => effect.is(setHighlightedBlockEffect) || effect.is(clearHighlightedBlockEffect));
      if (!effect) return decorations.map(tr.changes);
      if (effect.is(clearHighlightedBlockEffect)) return Decoration.none;
      const { fromLine, toLine } = effect.value;
      const lines = Array.from({ length: toLine - fromLine + 1 }, (_, i) => tr.state.doc.line(fromLine + i + 1));
      return Decoration.set(lines.map(line => Decoration.line({ class: 'highlighted-block' }).range(line.from)));
    },
    provide: deco => EditorView.decorations.from(deco),
  });

  const setHighlightedBlock = ({ view, startsWith, openingToken = '{', closingToken = '}' }) => {
    const lines = view.state.doc.toString().split('\n');
    const fromLineIndex = lines.findIndex(line => line.trim().startsWith(startsWith));
    if (fromLineIndex === -1) return;

    let blockBalance = 0;
    let toLineIndex = fromLineIndex;
    for (let i = fromLineIndex; i < lines.length; i++) {
      const openingTokenCount = strUtils.countSubstring(lines[i], openingToken);
      const closingTokenCount = strUtils.countSubstring(lines[i], closingToken);
      blockBalance += openingTokenCount - closingTokenCount;
      if (blockBalance === 0) {
        toLineIndex = i;
        break;
      }
    }
    clearHighlightedBlock(view);
    requestAnimationFrame(() => {
      view.dispatch({
        effects: [
          setHighlightedBlockEffect.of({
            fromLine: fromLineIndex,
            toLine: toLineIndex,
          }),
          EditorView.scrollIntoView(view.state.doc.line(fromLineIndex).from, { y: 'start' }),
        ],
      });
    });
  };

  const clearHighlightedBlock = (view) => {
    if (!view) return;
    view.dispatch({
      effects: [clearHighlightedBlockEffect.of(null)],
    });
  };

  const variableCompletion = ({ context, variables, matcher }) => {
    const before = context.state.sliceDoc(
      Math.max(0, context.pos - 50),
      context.pos,
    );
    const match = matcher.exec(before);
    if (!match) return null;
    return {
      from: context.pos - match[1].length,
      options: variables.map(name => ({
        label: name,
        type: 'variable',
        apply: ` ${name} `,
      })),
    };
  };

  const createVariableHighlightExtension = ({
    getAllowedKeys,
    pattern = /\{\{\s*([^}]+?)\s*\}\}/g, // Custom patterns must be a global regex whose capture group 1 is the variable key
  } = {}) => {
    const regex = pattern;

    const buildDecorations = (view) => {
      const builder = new RangeSetBuilder();
      const text = view.state.doc.toString();
      let match;
      while ((match = regex.exec(text)) !== null) {
        const rawKey = match[1]?.trim();
        const allowed = getAllowedKeys().has(rawKey);
        builder.add(
          match.index,
          match.index + match[0].length,
          Decoration.mark({ class: allowed ? 'editor-var--valid' : 'editor-var--invalid' }),
        );
      }
      return builder.finish();
    };

    return ViewPlugin.fromClass(class {
      constructor(view) {
        this.decorations = buildDecorations(view);
      }

      update(update) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    }, {
      decorations: v => v.decorations,
    });
  };

  return {
    clearHighlightedBlock,
    createVariableHighlightExtension,
    highlightedStateField,
    setHighlightedBlock,
    variableCompletion,
  };
}
