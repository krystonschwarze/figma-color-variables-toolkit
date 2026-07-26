import {
  bindFieldFocus,
  bindSegmented,
  byId,
  fillSelect,
  setVisible,
} from '../../../ui-kit/kit.ts';
import type { CollectionInfo } from '../../variables/collections.ts';
import type {
  CreateTarget,
  GenerateOutcome,
  PluginMessage,
  SelectionInfo,
} from '../../messages.ts';
import { notice, plural, send, setMeta } from '../shell.ts';
import type { Screen } from '../shell.ts';

const el = {
  screen: byId('screen-from-selection'),
  empty: byId('generateEmpty'),
  emptyText: byId('generateEmptyText'),
  form: byId('generateForm'),
  targetKind: byId('generateTargetKind'),
  newRow: byId('newRow'),
  newName: byId<HTMLInputElement>('newName'),
  existingRow: byId('existingRow'),
  collection: byId<HTMLSelectElement>('generateCollection'),
  modeGroup: byId('generateModeGroup'),
  mode: byId<HTMLSelectElement>('generateMode'),
  bindFills: byId<HTMLInputElement>('bindFills'),
  action: byId<HTMLButtonElement>('generateAction'),
};

let collections: readonly CollectionInfo[] = [];
let selection: SelectionInfo = { total: 0, eligible: 0 };
let targetKind: CreateTarget['kind'] = 'new';

function selected(): CollectionInfo | undefined {
  return collections.find((collection) => collection.id === el.collection.value);
}

function syncModes(): void {
  const modes = targetKind === 'existing' ? (selected()?.modes ?? []) : [];
  setVisible(el.modeGroup, modes.length > 1);
  if (modes.length > 1) {
    fillSelect(
      el.mode,
      'Default mode',
      modes.map((mode) => ({ value: mode.id, label: mode.name })),
    );
  }
}

function syncAction(): void {
  const hasTarget =
    targetKind === 'new' ? el.newName.value.trim().length > 0 : el.collection.value.length > 0;
  el.action.disabled = !hasTarget || selection.eligible === 0;
}

function syncTarget(): void {
  setVisible(el.newRow, targetKind === 'new');
  setVisible(el.existingRow, targetKind === 'existing');
  syncModes();
  syncAction();
}

function metaText(): string {
  const { total, eligible } = selection;
  if (eligible === 0) return '';
  return `${plural(eligible, 'layer')}${eligible === total ? '' : ` of ${total}`}`;
}

function syncSelection(next: SelectionInfo): void {
  selection = next;
  const { total, eligible } = next;

  el.emptyText.textContent =
    total === 0
      ? 'Select one or more layers with a solid fill.'
      : 'None of the selected layers has a single solid fill and a usable name.';

  setVisible(el.form, eligible > 0);
  setVisible(el.empty, eligible === 0);
  /* Selection keeps updating while another direction is showing, so leave that header alone. */
  if (!el.screen.hidden) setMeta(metaText());
  syncAction();
}

function describe(outcome: GenerateOutcome): string {
  const parts = [
    outcome.created > 0 ? `${outcome.created} created` : null,
    outcome.updated > 0 ? `${outcome.updated} updated` : null,
    outcome.skipped > 0 ? `${outcome.skipped} skipped` : null,
    outcome.failed > 0 ? `${outcome.failed} failed` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(', ') : 'Nothing to do.';
}

const selectTarget = bindSegmented(el.targetKind, (value) => {
  targetKind = value as CreateTarget['kind'];
  syncTarget();
});

el.newName.addEventListener('input', syncAction);
el.collection.addEventListener('change', () => {
  syncModes();
  syncAction();
});

el.action.addEventListener('click', () => {
  const target: CreateTarget =
    targetKind === 'new'
      ? { kind: 'new', name: el.newName.value }
      : { kind: 'existing', id: el.collection.value };

  el.action.disabled = true;
  send({
    type: 'generate',
    request: {
      target,
      modeId: el.modeGroup.hidden ? null : el.mode.value || null,
      bindFills: el.bindFills.checked,
    },
  });
});

bindFieldFocus(el.screen);

export const generateScreen: Screen = {
  element: el.screen,
  actions: [el.action],

  activate() {
    selectTarget(targetKind);
    syncTarget();
    setMeta(metaText());
  },

  onCollections(next) {
    collections = next;
    fillSelect(
      el.collection,
      next.length === 0 ? 'No collections yet' : 'Select a collection',
      next.map((collection) => ({ value: collection.id, label: collection.name })),
    );
    el.collection.disabled = next.length === 0;
    syncModes();
    syncAction();
  },

  onMessage(message: PluginMessage) {
    if (message.type === 'selection') {
      syncSelection(message.selection);
      return;
    }
    if (message.type === 'generate-done') {
      notice(message.outcome.failed > 0 ? 'error' : 'success', describe(message.outcome));
      if (targetKind === 'new') el.newName.value = '';
      syncAction();
      return;
    }
    if (message.type === 'error') syncAction();
  },
};
