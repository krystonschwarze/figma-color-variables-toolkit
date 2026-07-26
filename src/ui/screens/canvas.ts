import { bindFieldFocus, byId, fillSelect, readNumber, setVisible } from '../../../ui-kit/kit.ts';
import type { CollectionInfo } from '../../variables/collections.ts';
import { DEFAULT_SWATCH } from '../../messages.ts';
import type { CanvasOutcome, PluginMessage } from '../../messages.ts';
import { notice, plural, send } from '../shell.ts';
import type { Screen } from '../shell.ts';

const el = {
  screen: byId('screen-to-canvas'),
  empty: byId('canvasEmpty'),
  form: byId('canvasForm'),
  collection: byId<HTMLSelectElement>('canvasCollection'),
  meta: byId('canvasMeta'),
  swatchSize: byId<HTMLInputElement>('swatchSize'),
  action: byId<HTMLButtonElement>('canvasAction'),
};

let collections: readonly CollectionInfo[] = [];

function selected(): CollectionInfo | undefined {
  return collections.find((collection) => collection.id === el.collection.value);
}

function syncMeta(): void {
  const collection = selected();
  if (!collection) {
    el.meta.textContent = '';
    el.action.disabled = true;
    return;
  }

  const parts = [plural(collection.colorCount, 'color'), plural(collection.modes.length, 'mode')];
  if (collection.otherCount > 0) {
    parts.push(`${plural(collection.otherCount, 'other variable')} will be skipped`);
  }
  el.meta.textContent = parts.join(', ');
  el.action.disabled = collection.colorCount === 0;
}

function describe(outcome: CanvasOutcome): string {
  const parts = [`${plural(outcome.swatches, 'swatch')} across ${plural(outcome.modes, 'mode')}`];
  if (outcome.skipped > 0) parts.push(`${outcome.skipped} skipped`);
  return parts.join(', ');
}

el.collection.addEventListener('change', syncMeta);

el.action.addEventListener('click', () => {
  const collection = selected();
  if (!collection) return;
  el.action.disabled = true;
  el.action.textContent = 'Generating';
  send({
    type: 'canvas',
    request: {
      collectionId: collection.id,
      swatchSize: readNumber(el.swatchSize, DEFAULT_SWATCH),
    },
  });
});

function settle(): void {
  el.action.textContent = 'Generate';
  syncMeta();
}

bindFieldFocus(el.screen);
el.swatchSize.value = String(DEFAULT_SWATCH);

export const canvasScreen: Screen = {
  element: el.screen,
  actions: [el.action],

  activate() {
    syncMeta();
  },

  onCollections(next) {
    collections = next;
    setVisible(el.form, next.length > 0);
    setVisible(el.empty, next.length === 0);
    fillSelect(
      el.collection,
      'Select a collection',
      next.map((collection) => ({ value: collection.id, label: collection.name })),
    );
    if (next.length === 1) el.collection.value = next[0]?.id ?? '';
    syncMeta();
  },

  onMessage(message: PluginMessage) {
    if (message.type === 'canvas-done') {
      notice('success', describe(message.outcome));
      settle();
      return;
    }
    if (message.type === 'error') settle();
  },
};
