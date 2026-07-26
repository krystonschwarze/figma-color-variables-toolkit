import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  byLeaf,
  groupOf,
  groupsOf,
  leafOf,
  naturalCompare,
  pathOf,
  variableNameOf,
} from './naming.ts';

test('pathOf drops empty segments and trims whitespace', () => {
  assert.deepEqual(pathOf(' color / base // 01 '), ['color', 'base', '01']);
  assert.deepEqual(pathOf('///'), []);
});

test('groupOf and leafOf split on the last slash', () => {
  assert.equal(groupOf('design/static/alpha/01'), 'design/static/alpha');
  assert.equal(leafOf('design/static/alpha/01'), '01');
  assert.equal(groupOf('ungrouped'), '');
  assert.equal(leafOf('ungrouped'), 'ungrouped');
});

test('variableNameOf normalises a layer name', () => {
  assert.equal(variableNameOf('primary'), 'primary');
  assert.equal(variableNameOf('brand/primary'), 'brand/primary');
  assert.equal(variableNameOf('  brand / primary  '), 'brand/primary');
  assert.equal(variableNameOf('brand//primary'), 'brand/primary');
  assert.equal(variableNameOf('/brand/primary/'), 'brand/primary');
});

test('variableNameOf rejects a name with nothing usable left', () => {
  assert.equal(variableNameOf(''), null);
  assert.equal(variableNameOf('   '), null);
  assert.equal(variableNameOf('///'), null);
  assert.equal(variableNameOf(' / / '), null);
});

test('groupsOf lists nested groups and drops ungrouped variables', () => {
  const variables = [{ name: 'color/base/01' }, { name: 'color/brand/01' }, { name: 'loose' }];
  assert.deepEqual(groupsOf(variables), ['color/base', 'color/brand']);
});

test('byLeaf only picks up the exact group, not nested ones', () => {
  const variables = [
    { name: 'color/base/01' },
    { name: 'color/base/deep/01' },
    { name: 'color/base/02' },
  ];
  assert.deepEqual([...byLeaf(variables, 'color/base').keys()].sort(), ['01', '02']);
});

test('naturalCompare orders zero padded numbers numerically', () => {
  assert.deepEqual(['10', '02', '1', '01', '9'].sort(naturalCompare), ['1', '01', '02', '9', '10']);
});

test('naturalCompare mixes text and numbers', () => {
  assert.deepEqual(['step-10', 'step-2', 'step-1'].sort(naturalCompare), [
    'step-1',
    'step-2',
    'step-10',
  ]);
});
