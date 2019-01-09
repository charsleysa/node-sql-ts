'use strict';

import assert = require('assert');
import { Table } from '../lib/table';

const Foo = Table.define<{ baz: string; bar: string }>({
    name: 'foo',
    columns: ['baz', 'bar']
});

test('operators', function() {
    assert.equal(Foo.bar.isNull().operator, 'IS NULL');
    assert.equal(Foo.baz.isNotNull().operator, 'IS NOT NULL');
});
