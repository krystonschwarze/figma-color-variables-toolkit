import { naturalCompare, pathOf } from './naming.ts';
import type { Named } from './naming.ts';

export interface GroupNode<T> {
  kind: 'group';
  children: Map<string, TreeNode<T>>;
}

export interface LeafNode<T> {
  kind: 'variable';
  variable: T;
}

export type TreeNode<T> = GroupNode<T> | LeafNode<T>;

export function emptyGroup<T>(): GroupNode<T> {
  return { kind: 'group', children: new Map() };
}

export function insert<T extends Named>(root: GroupNode<T>, variable: T): void {
  const path = pathOf(variable.name);
  const leaf = path.pop();
  if (leaf === undefined) return;

  let node = root;
  for (const segment of path) {
    const existing = node.children.get(segment);
    if (existing?.kind === 'group') {
      node = existing;
      continue;
    }
    const group = emptyGroup<T>();
    /* A name can be both a leaf and a prefix, so an existing variable moves inside the new group. */
    if (existing) group.children.set(segment, existing);
    node.children.set(segment, group);
    node = group;
  }

  /*
   * The leaf slot may already hold a group when a sibling is named `<leaf>/something`. Nesting the
   * variable inside keeps it visible and makes the result independent of insert order.
   */
  const occupant = node.children.get(leaf);
  if (!occupant) node.children.set(leaf, { kind: 'variable', variable });
  else if (occupant.kind === 'group' && !occupant.children.has(leaf)) {
    occupant.children.set(leaf, { kind: 'variable', variable });
  }
}

export function buildTree<T extends Named>(variables: readonly T[]): GroupNode<T> {
  const root = emptyGroup<T>();
  for (const variable of variables) insert(root, variable);
  return root;
}

export function sortedEntries<T>(node: GroupNode<T>): [string, TreeNode<T>][] {
  return [...node.children.entries()].sort(([a], [b]) => naturalCompare(a, b));
}

export function holdsOnlyVariables<T>(node: GroupNode<T>): boolean {
  return [...node.children.values()].every((entry) => entry.kind === 'variable');
}
