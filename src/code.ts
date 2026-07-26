import type { PluginMessage, UiMessage } from './messages.ts';
import { readCollections } from './variables/collections.ts';
import * as canvas from './tools/canvas.ts';
import * as generate from './tools/generate.ts';

figma.showUI(__html__, {
  width: 340,
  height: 480,
  title: 'Color Variables Toolkit',
  themeColors: true,
});

function send(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

async function handleMessage(message: UiMessage): Promise<void> {
  switch (message.type) {
    case 'generate': {
      const outcome = await generate.generate(message.request);
      send({ type: 'generate-done', outcome });
      send({ type: 'collections', collections: await readCollections() });
      figma.notify(generate.summarizeGenerate(outcome), { error: outcome.failed > 0 });
      return;
    }

    case 'canvas': {
      const outcome = await canvas.draw(message.request);
      send({ type: 'canvas-done', outcome });
      figma.notify(canvas.summarizeCanvas(outcome));
      return;
    }
  }
}

figma.ui.onmessage = (message: UiMessage) => {
  void handleMessage(message).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    send({ type: 'error', message: detail });
    figma.notify(detail, { error: true });
  });
};

figma.on('selectionchange', () => {
  send({ type: 'selection', selection: generate.readSelection() });
});

async function start(): Promise<void> {
  send({ type: 'collections', collections: await readCollections() });
  send({ type: 'selection', selection: generate.readSelection() });
}

void start();
