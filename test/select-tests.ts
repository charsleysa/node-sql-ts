'use strict';

import { equal } from 'assert';
import { SelectNode } from '../lib/node';

const select = new SelectNode();

test('has SELECT type', function() {
    equal(select.type, 'SELECT');
});
