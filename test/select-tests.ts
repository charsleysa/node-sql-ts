'use strict';

import { strictEqual } from 'assert';
import { SelectNode } from '../lib/node';

const select = new SelectNode();

test('has SELECT type', function() {
    strictEqual(select.type, 'SELECT');
});
