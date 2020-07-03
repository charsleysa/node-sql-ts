'use strict';

import assert from 'assert';
import { Table } from '../lib/table';

const Foo = Table.define<{ baz: string; bar: string }>({
    name: 'foo',
    columns: ['baz', 'bar']
});

test('operators', function() {
    assert.equal(Foo.bar.between(1, 2).operator, 'BETWEEN');
    assert.equal(Foo.baz.between(1, 2).separator, 'AND');
});
