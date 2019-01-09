'use strict';
import assert = require('assert');
import { equal, ok, throws, doesNotThrow, notEqual } from 'assert';

import { Table } from '../lib/table';
import { Column } from '../lib/column';
import { Sql } from '../lib';
import { ColumnNode, ModifierNode } from '../lib/node';

suite('table', function() {
    const table = new Table({
        name: 'bang'
    } as any);

    test('has name', function() {
        equal(table.getName(), 'bang');
    });

    test('has no columns', function() {
        equal(table.columns.length, 0);
    });

    test('can add column', function() {
        const col = new Column({
            table: table,
            name: 'boom'
        });

        equal(col.name, 'boom');
        equal(col.table!.getName(), 'bang');

        table.addColumn(col);
        equal(table.columns.length, 1);
        //@ts-ignore column added after table created
        equal(table.boom, col);
    });

    test('creates query node', function() {
        //@ts-ignore column added after table created
        const sel = table.select(table.boom);
        equal(sel.type, 'QUERY');
    });

    test('creates *-query if no args is provided to select()', function() {
        const sel = table.select();
        ok((sel.nodes[0].nodes[0] as ColumnNode).star);
    });

    test('can be defined', function() {
        const user = Table.define<{ id: number; name: string }>({
            name: 'user',
            columns: ['id', 'name']
        });
        equal(user.getName(), 'user');
        equal(user.columns.length, 2);
        equal(user.columns[0].name, 'id');
        equal(user.columns[1].name, 'name');
        equal(user.columns[0].name, user.id.name);
        equal(user.id.table, user);
        equal(user.name.table, user);
    });
});

test('table with user-defined column property names', function() {
    const table = Table.define<{ theId: number; uniqueEmail: string }>({
        name: 'blah',
        columns: [
            {
                name: 'id',
                property: 'theId'
            },
            {
                name: 'email',
                property: 'uniqueEmail'
            }
        ]
    });
    const cols = table.columns;
    equal(cols.length, 2);
    equal(cols[0].name, 'id');
    assert(cols[0] === table.theId, 'Expected table.theId to be the first column');
    //@ts-ignore id doesn't exist
    assert(table.id === undefined, 'Expected table.id to not exist');
    equal(cols[1].name, 'email');
    assert(cols[1] === table.uniqueEmail, 'Expected table.uniqueEmail to be the second column');
    //@ts-ignore email doesn't exist
    assert(table.email === undefined, 'Expected table.email to not exist');
});

test('table with fancier column definitions', function() {
    const table = Table.define({
        name: 'blah',
        columns: [
            {
                name: 'id',
                dataType: 'serial',
                notNull: true,
                primaryKey: true
            },
            {
                name: 'email',
                dataType: 'text',
                notNull: true,
                unique: true
            }
        ]
    });
    const cols = table.columns;
    equal(cols.length, 2);
    const id = cols[0];
    equal(id.name, 'id');
    equal(id.dataType, 'serial');
    equal(id.notNull, true);
    equal(id.primaryKey, true);
    const email = cols[1];
    equal(email.name, 'email');
    equal(email.dataType, 'text');
    equal(email.notNull, true);
    equal(email.unique, true);
});

test('table with object structured column definitions', function() {
    const table = Table.define({
        name: 'blah',
        columns: {
            id: {
                dataType: 'serial',
                notNull: true,
                primaryKey: true
            },
            email: {
                dataType: 'text',
                notNull: true,
                unique: true
            }
        }
    });
    const cols = table.columns;
    equal(cols.length, 2);
    const id = cols[0];
    equal(id.name, 'id');
    equal(id.dataType, 'serial');
    equal(id.notNull, true);
    equal(id.primaryKey, true);
    const email = cols[1];
    equal(email.name, 'email');
    equal(email.dataType, 'text');
    equal(email.notNull, true);
    equal(email.unique, true);
});

test('table with dynamic column definition', function() {
    const table = Table.define({ name: 'foo', columns: [] });
    equal(table.columns.length, 0);

    table.addColumn('foo');
    equal(table.columns.length, 1);

    throws(function() {
        table.addColumn('foo');
    });

    doesNotThrow(function() {
        table.addColumn('foo', { noisy: false });
    });

    equal(table.columns.length, 1);
});

test('hasColumn', function() {
    const table = Table.define({ name: 'foo', columns: [] });

    equal(table.hasColumn('baz'), false);
    table.addColumn('baz');
    equal(table.hasColumn('baz'), true);
});

test('hasColumn with user-defined column property', function() {
    const table = Table.define({
        name: 'blah',
        columns: [
            {
                name: 'id',
                property: 'theId'
            },
            { name: 'foo' }
        ]
    });

    equal(table.hasColumn('id'), true);
    equal(table.hasColumn('theId'), true);
});

test('the column "from" does not overwrite the from method', function() {
    const table = Table.define({ name: 'foo', columns: [] });
    table.addColumn('from');
    equal(typeof table.from, 'function');
});

test('getColumn returns the from column', function() {
    const table = Table.define({ name: 'foo', columns: [] });
    table.addColumn('from');
    assert(table.getColumn('from') instanceof Column);
    assert(table.get('from') instanceof Column);
});

test('set and get schema', function() {
    const table = Table.define({ name: 'foo', schema: 'bar', columns: [] });
    equal(table.getSchema(), 'bar');
    table.setSchema('barbarz');
    equal(table.getSchema(), 'barbarz');
});

suite('table.clone', function() {
    test('check if it is a copy, not just a reference', function() {
        const table = Table.define({ name: 'foo', columns: [] });
        const copy = table.clone();
        notEqual(table, copy);
    });

    test('copy columns', function() {
        const table = Table.define({ name: 'foo', columns: ['bar'] });
        const copy = table.clone();
        assert(copy.get('bar') instanceof Column);
    });

    test('overwrite config while copying', function() {
        const table = Table.define({
            name: 'foo',
            schema: 'foobar',
            columns: ['bar'],
            snakeToCamel: true,
            columnWhiteList: true
        });

        const copy = table.clone({
            schema: 'test',
            snakeToCamel: false,
            columnWhiteList: false
        });

        equal(copy.getSchema(), 'test');
        equal(copy.snakeToCamel, false);
        equal(copy.columnWhiteList, false);
    });
});

test('dialects', function() {
    const sql1 = new Sql('mysql');
    const foo1 = sql1.define<{ id: number }>({ name: 'foo', columns: ['id'] }),
        bar1 = sql1.define<{ id: number }>({ name: 'bar', columns: ['id'] });

    const actual1 = foo1
        .join(bar1)
        .on(bar1.id.equals(1))
        .toString();
    equal(actual1, '`foo` INNER JOIN `bar` ON (`bar`.`id` = 1)');

    const sql2 = new Sql('postgres');
    const foo2 = sql2.define<{ id: number }>({ name: 'foo', columns: ['id'] });
    const bar2 = sql2.define<{ id: number }>({ name: 'bar', columns: ['id'] });
    const actual2 = foo2
        .join(bar2)
        .on(bar2.id.equals(1))
        .toString();
    equal(actual2, '"foo" INNER JOIN "bar" ON ("bar"."id" = 1)');
});

test('limit', function() {
    const user = Table.define({ name: 'user', columns: ['id', 'name'] });
    const query = user.limit(3);
    equal(query.nodes.length, 1);
    equal(query.nodes[0].type, 'LIMIT');
    equal((query.nodes[0] as ModifierNode).count, 3);
});

test('offset', function() {
    const user = Table.define({ name: 'user', columns: ['id', 'name'] });
    const query = user.offset(20);
    equal(query.nodes.length, 1);
    equal(query.nodes[0].type, 'OFFSET');
    equal((query.nodes[0] as ModifierNode).count, 20);
});

test('order', function() {
    const user = Table.define<{ id: number; name: string }>({ name: 'user', columns: ['id', 'name'] });
    const query = user.order(user.name);
    equal(query.nodes.length, 1);
    equal(query.nodes[0].type, 'ORDER BY');
});
