import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTree, holdsOnlyVariables, sortedEntries } from './tree.ts';
import type { GroupNode, TreeNode } from './tree.ts';

interface Fake {
  name: string;
}

function v(name: string): Fake {
  return { name };
}

function shape(node: TreeNode<Fake>): unknown {
  if (node.kind === 'variable') return node.variable.name;
  return Object.fromEntries(sortedEntries(node).map(([key, child]) => [key, shape(child)]));
}

test('buildTree nests groups from the slashes in the name', () => {
  const tree = buildTree([v('design/static/alpha/01'), v('design/static/alpha/02')]);

  assert.deepEqual(shape(tree), {
    design: {
      static: { alpha: { '01': 'design/static/alpha/01', '02': 'design/static/alpha/02' } },
    },
  });
});

test('a variable without slashes sits at the root', () => {
  assert.deepEqual(shape(buildTree([v('loose')])), { loose: 'loose' });
});

test('a name that is both a leaf and a prefix keeps both variables', () => {
  assert.deepEqual(shape(buildTree([v('a/b'), v('a/b/c')])), {
    a: { b: { b: 'a/b', c: 'a/b/c' } },
  });
});

test('the same collision resolves the same way in the opposite insert order', () => {
  const forward = buildTree([v('a/b'), v('a/b/c')]);
  const backward = buildTree([v('a/b/c'), v('a/b')]);

  assert.deepEqual(shape(forward), shape(backward));
});

test('sortedEntries applies natural order to group keys', () => {
  const tree = buildTree([v('g/10'), v('g/2'), v('g/1')]);
  const group = tree.children.get('g') as GroupNode<Fake>;

  assert.deepEqual(
    sortedEntries(group).map(([key]) => key),
    ['1', '2', '10'],
  );
});

test('holdsOnlyVariables distinguishes leaf groups from nesting groups', () => {
  const tree = buildTree([v('a/01'), v('b/deep/01')]);

  assert.equal(holdsOnlyVariables(tree.children.get('a') as GroupNode<Fake>), true);
  assert.equal(holdsOnlyVariables(tree.children.get('b') as GroupNode<Fake>), false);
});
