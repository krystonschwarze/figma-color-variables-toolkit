import { byId, postToPlugin, setVisible, showNotice } from '../../ui-kit/kit.ts';
import type { NoticeKind } from '../../ui-kit/kit.ts';
import type { CollectionInfo } from '../variables/collections.ts';
import type { PluginMessage, UiMessage } from '../messages.ts';

const noticeGroup = byId('noticeGroup');
const noticeBox = byId('notice');
const headerMeta = byId('headerMeta');

export function send(message: UiMessage): void {
  postToPlugin(message);
}

export function notice(kind: NoticeKind, text: string): void {
  setVisible(noticeGroup, true);
  showNotice(noticeBox, kind, text);
}

export function clearNotice(): void {
  setVisible(noticeGroup, false);
  noticeBox.textContent = '';
}

export function setMeta(text: string): void {
  headerMeta.textContent = text;
}

export interface Screen {
  readonly element: HTMLElement;
  readonly actions: readonly HTMLButtonElement[];
  activate(): void;
  onCollections(collections: readonly CollectionInfo[]): void;
  onMessage(message: PluginMessage): void;
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
