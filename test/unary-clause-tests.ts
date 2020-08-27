'use strict';

import assert from 'assert';
import { Table } from '../lib/table';

const Foo = Table.define<{ baz: string; bar: string }>({
    name: 'foo',
    columns: ['baz', 'bar']
});

test('operators', function() {
    assert.strictEqual(Foo.bar.isNull().operator, 'IS NULL');
    assert.strictEqual(Foo.baz.isNotNull().operator, 'IS NOT NULL');
});
