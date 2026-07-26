import type { GenerateOutcome, GenerateRequest, SelectionInfo } from '../messages.ts';
import { collectionById, resolveModeId } from '../variables/collections.ts';
import { variableNameOf } from '../variables/naming.ts';

type FillableNode = SceneNode & MinimalFillsMixin;

export function solidFillOf(node: SceneNode): SolidPaint | null {
  if (!('fills' in node)) return null;
  const { fills } = node as FillableNode;
  if (fills === figma.mixed) return null;
  const visible = fills.filter((paint) => paint.visible !== false);
  const [first] = visible;
  return visible.length === 1 && first?.type === 'SOLID' ? first : null;
}

export function readSelection(): SelectionInfo {
  const selection = figma.currentPage.selection;
  const eligible = selection.filter(
    (node) => solidFillOf(node) !== null && variableNameOf(node.name) !== null,
  );
  return { total: selection.length, eligible: eligible.length };
}

async function targetCollection(request: GenerateRequest): Promise<VariableCollection> {
  if (request.target.kind === 'new') {
    const name = request.target.name.trim();
    if (name.length === 0) throw new Error('Enter a name for the new collection.');
    return figma.variables.createVariableCollection(name);
  }
  return collectionById(request.target.id);
}

export async function generate(request: GenerateRequest): Promise<GenerateOutcome> {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) throw new Error('Select at least one layer.');

  const collection = await targetCollection(request);
  const modeId = resolveModeId(collection, request.modeId);

  const existing = new Map<string, Variable>();
  for (const variable of await figma.variables.getLocalVariablesAsync('COLOR')) {
    if (variable.variableCollectionId === collection.id) existing.set(variable.name, variable);
  }

  const outcome: GenerateOutcome = { created: 0, updated: 0, skipped: 0, failed: 0 };

  for (const node of selection) {
    const fill = solidFillOf(node);
    const name = variableNameOf(node.name);
    if (!fill || !name) {
      outcome.skipped += 1;
      continue;
    }

    try {
      let variable = existing.get(name);
      if (variable) {
        outcome.updated += 1;
      } else {
        variable = figma.variables.createVariable(name, collection, 'COLOR');
        existing.set(name, variable);
        outcome.created += 1;
      }

      variable.setValueForMode(modeId, {
        r: fill.color.r,
        g: fill.color.g,
        b: fill.color.b,
        a: fill.opacity ?? 1,
      });

      if (request.bindFills) {
        const target = node as FillableNode;
        if (target.fillStyleId !== '') await target.setFillStyleIdAsync('');
        target.fills = [figma.variables.setBoundVariableForPaint(fill, 'color', variable)];
      }
    } catch (error) {
      console.error(`Failed on "${node.name}"`, error);
      outcome.failed += 1;
    }
  }

  return outcome;
}

export function summarizeGenerate(outcome: GenerateOutcome): string {
  const parts = [
    outcome.created > 0 ? `${outcome.created} created` : null,
    outcome.updated > 0 ? `${outcome.updated} updated` : null,
    outcome.skipped > 0 ? `${outcome.skipped} skipped` : null,
    outcome.failed > 0 ? `${outcome.failed} failed` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(', ') : 'Nothing to do.';
}
