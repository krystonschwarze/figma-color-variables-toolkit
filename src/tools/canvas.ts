import { MAX_SWATCH, MIN_SWATCH } from '../messages.ts';
import type { CanvasOutcome, CanvasRequest } from '../messages.ts';
import { collectionById, variablesIn } from '../variables/collections.ts';
import { buildTree, holdsOnlyVariables, sortedEntries } from '../variables/tree.ts';
import type { GroupNode } from '../variables/tree.ts';

const GAP = 16;
const PAGE_MARGIN = 200;

const CONTAINER_FILL: SolidPaint = { type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } };
const GROUP_FILL: SolidPaint = { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } };

function configureAutoLayout(frame: FrameNode, mode: 'HORIZONTAL' | 'VERTICAL'): void {
  frame.layoutMode = mode;
  frame.layoutWrap = 'NO_WRAP';
  frame.itemSpacing = GAP;
  frame.paddingTop = GAP;
  frame.paddingRight = GAP;
  frame.paddingBottom = GAP;
  frame.paddingLeft = GAP;
}

function hug(frame: FrameNode): void {
  frame.layoutSizingHorizontal = 'HUG';
  frame.layoutSizingVertical = 'HUG';
}

function createSwatch(variable: Variable, size: number): FrameNode {
  const swatch = figma.createFrame();
  swatch.name = variable.name;
  swatch.resize(size, size);
  swatch.cornerRadius = 4;
  swatch.fills = [
    figma.variables.setBoundVariableForPaint(
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
      'color',
      variable,
    ),
  ];
  return swatch;
}

function renderGroup(
  node: GroupNode<Variable>,
  parent: FrameNode,
  size: number,
  counter: { drawn: number },
): void {
  for (const [name, child] of sortedEntries(node)) {
    if (child.kind === 'variable') {
      if (child.variable.resolvedType !== 'COLOR') continue;
      parent.appendChild(createSwatch(child.variable, size));
      counter.drawn += 1;
      continue;
    }

    const frame = figma.createFrame();
    frame.name = name;
    frame.fills = [GROUP_FILL];
    frame.cornerRadius = 6;
    configureAutoLayout(frame, holdsOnlyVariables(child) ? 'HORIZONTAL' : 'VERTICAL');

    renderGroup(child, frame, size, counter);

    if (frame.children.length === 0) {
      frame.remove();
      continue;
    }
    hug(frame);
    parent.appendChild(frame);
  }
}

function nextFreeX(): number {
  const edges = figma.currentPage.children
    .filter((node): node is SceneNode & { width: number } => 'width' in node)
    .map((node) => node.x + node.width);
  return edges.length === 0 ? 0 : Math.max(...edges) + PAGE_MARGIN;
}

export async function draw(request: CanvasRequest): Promise<CanvasOutcome> {
  const collection = await collectionById(request.collectionId);
  const size = Math.min(MAX_SWATCH, Math.max(MIN_SWATCH, Math.round(request.swatchSize)));
  const variables = await variablesIn(collection.id);
  if (variables.length === 0) throw new Error(`"${collection.name}" has no variables.`);

  const tree = buildTree(variables);
  const counter = { drawn: 0 };
  const skipped = variables.filter((variable) => variable.resolvedType !== 'COLOR').length;
  let modes = 0;

  const root = figma.createFrame();
  root.name = `Variables ${collection.name}`;
  root.fills = [CONTAINER_FILL];
  root.cornerRadius = 8;
  configureAutoLayout(root, 'HORIZONTAL');
  root.x = nextFreeX();
  root.y = 0;
  figma.currentPage.appendChild(root);

  for (const mode of collection.modes) {
    const modeFrame = figma.createFrame();
    modeFrame.name = mode.name;
    modeFrame.fills = [CONTAINER_FILL];
    modeFrame.cornerRadius = 8;
    configureAutoLayout(modeFrame, 'VERTICAL');

    /* Without an explicit mode every frame resolves through the page default and looks alike. */
    modeFrame.setExplicitVariableModeForCollection(collection, mode.modeId);

    renderGroup(tree, modeFrame, size, counter);

    if (modeFrame.children.length === 0) {
      modeFrame.remove();
      continue;
    }
    hug(modeFrame);
    root.appendChild(modeFrame);
    modes += 1;
  }

  if (root.children.length === 0) {
    root.remove();
    throw new Error(`"${collection.name}" has no color variables to draw.`);
  }

  hug(root);
  figma.currentPage.selection = [root];
  figma.viewport.scrollAndZoomIntoView([root]);
  return { modes, swatches: counter.drawn, skipped };
}

export function summarizeCanvas(outcome: CanvasOutcome): string {
  const parts = [`${outcome.swatches} swatches across ${outcome.modes} modes`];
  if (outcome.skipped > 0) parts.push(`${outcome.skipped} non color variables skipped`);
  return parts.join(', ');
}
