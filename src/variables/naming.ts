/*
 * Figma stores variable hierarchy in the name itself, with a slash as the group separator. Every
 * tool in this plugin reads that same convention, so it lives here once.
 */

/* Structural subset of Variable, so this module stays testable without the Figma API. */
export interface Named {
  readonly name: string;
}

export interface Typed extends Named {
  readonly id: string;
  readonly resolvedType: string;
}

export function pathOf(name: string): string[] {
  return name
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

export function groupOf(name: string): string {
  const index = name.lastIndexOf('/');
  return index === -1 ? '' : name.slice(0, index);
}

export function leafOf(name: string): string {
  const index = name.lastIndexOf('/');
  return index === -1 ? name : name.slice(index + 1);
}

/**
 * Turns a layer name into a variable name. Empty segments would create unnamed groups, so they
 * collapse. Returns null when nothing usable is left.
 */
export function variableNameOf(layerName: string): string | null {
  const segments = pathOf(layerName);
  return segments.length > 0 ? segments.join('/') : null;
}

export function groupsOf(variables: readonly Named[]): string[] {
  const groups = new Set(variables.map((variable) => groupOf(variable.name)));
  groups.delete('');
  return [...groups].sort((a, b) => a.localeCompare(b));
}

export function byLeaf<T extends Named>(variables: readonly T[], group: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const variable of variables) {
    if (groupOf(variable.name) === group) result.set(leafOf(variable.name), variable);
  }
  return result;
}

/* Sorts 01, 02, 10 rather than 01, 10, 02. */
export function naturalCompare(a: string, b: string): number {
  const parts = /(\d+|\D+)/g;
  const left = a.match(parts) ?? [];
  const right = b.match(parts) ?? [];

  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const l = left[i] ?? '';
    const r = right[i] ?? '';
    if (/^\d+$/.test(l) && /^\d+$/.test(r)) {
      const diff = Number.parseInt(l, 10) - Number.parseInt(r, 10);
      if (diff !== 0) return diff;
      continue;
    }
    const diff = l.localeCompare(r);
    if (diff !== 0) return diff;
  }
  return 0;
}
