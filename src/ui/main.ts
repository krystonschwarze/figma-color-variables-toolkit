import './styles.css';
import { bindSegmented, byId, onPluginMessage, setVisible } from '../../ui-kit/kit.ts';
import type { Direction, PluginMessage } from '../messages.ts';
import { clearNotice, setMeta } from './shell.ts';
import type { Screen } from './shell.ts';
import { canvasScreen } from './screens/canvas.ts';
import { generateScreen } from './screens/generate.ts';

const el = {
  directionSwitch: byId('directionSwitch'),
};

const screens: Record<Direction, Screen> = {
  'from-selection': generateScreen,
  'to-canvas': canvasScreen,
};

let direction: Direction = 'from-selection';

function render(): void {
  const active = screens[direction];
  setMeta('');
  clearNotice();

  for (const screen of Object.values(screens)) {
    const on = screen === active;
    setVisible(screen.element, on);
    for (const action of screen.actions) setVisible(action, on);
  }

  active.activate();
}

const selectDirection = bindSegmented(el.directionSwitch, (value) => {
  direction = value as Direction;
  render();
});

onPluginMessage<PluginMessage>((message) => {
  if (message.type === 'collections') {
    for (const screen of Object.values(screens)) screen.onCollections(message.collections);
    return;
  }

  /* Selection keeps updating while the canvas direction shows, so route it to its owner. */
  if (message.type === 'selection') {
    generateScreen.onMessage(message);
    return;
  }

  screens[direction].onMessage(message);
});

selectDirection(direction);
render();
