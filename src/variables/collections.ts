export interface ModeInfo {
  id: string;
  name: string;
}

export interface CollectionInfo {
  id: string;
  name: string;
  defaultModeId: string;
  modes: ModeInfo[];
  colorCount: number;
  otherCount: number;
}

export async function collectionById(id: string): Promise<VariableCollection> {
  const collection = await figma.variables.getVariableCollectionByIdAsync(id);
  if (!collection) throw new Error('That collection no longer exists.');
  return collection;
}

/* One API call for the whole document beats one call per variable id. */
export async function variablesIn(collectionId: string): Promise<Variable[]> {
  const all = await figma.variables.getLocalVariablesAsync();
  return all.filter((variable) => variable.variableCollectionId === collectionId);
}

export async function readCollections(): Promise<CollectionInfo[]> {
  const [collections, variables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync(),
  ]);

  return collections
    .map((collection) => {
      const own = variables.filter((v) => v.variableCollectionId === collection.id);
      return {
        id: collection.id,
        name: collection.name,
        defaultModeId: collection.defaultModeId,
        modes: collection.modes.map((mode) => ({ id: mode.modeId, name: mode.name })),
        colorCount: own.filter((v) => v.resolvedType === 'COLOR').length,
        otherCount: own.filter((v) => v.resolvedType !== 'COLOR').length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function requireMode(collection: VariableCollection, modeId: string): string {
  if (!collection.modes.some((mode) => mode.modeId === modeId)) {
    throw new Error('That mode does not belong to the target collection.');
  }
  return modeId;
}

export function resolveModeId(collection: VariableCollection, requested: string | null): string {
  const match = collection.modes.find((mode) => mode.modeId === requested);
  const fallback = collection.modes[0];
  if (!fallback) throw new Error('That collection has no modes.');
  return match?.modeId ?? fallback.modeId;
}

export function isAlias(value: VariableValue | undefined): value is VariableAlias {
  return typeof value === 'object' && value !== null && 'type' in value
    ? value.type === 'VARIABLE_ALIAS'
    : false;
}
