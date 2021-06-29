import { strictEqual } from 'assert';
import { SelectNode } from '../dist/lib.js';

const select = new SelectNode();

test('has SELECT type', function() {
    strictEqual(select.type, 'SELECT');
});
