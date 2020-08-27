'use strict';
import assert, { strictEqual, ok, throws, doesNotThrow, notStrictEqual } from 'assert';

import { Table } from '../lib/table';
import { Column } from '../lib/column';
import { Sql } from '../lib';
import { ColumnNode, ModifierNode, ParameterNode } from '../lib/node';

suite('table', function() {
    const table = new Table({
        name: 'bang'
    } as any);

    test('has name', function() {
        strictEqual(table.getName(), 'bang');
    });

    test('has no columns', function() {
        strictEqual(table.columns.length, 0);
    });

    test('can add column', function() {
        const col = new Column({
            table,
            name: 'boom'
        });

        strictEqual(col.name, 'boom');
        strictEqual(col.table!.getName(), 'bang');

        table.addColumn(col);
        strictEqual(table.columns.length, 1);
        // @ts-ignore column added after table created
        strictEqual(table.boom, col);
    });

    test('creates query node', function() {
        // @ts-ignore column added after table created
        const sel = table.select(table.boom);
        strictEqual(sel.type, 'QUERY');
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
        strictEqual(user.getName(), 'user');
        strictEqual(user.columns.length, 2);
        strictEqual(user.columns[0].name, 'id');
        strictEqual(user.columns[1].name, 'name');
        strictEqual(user.columns[0].name, user.id.name);
        strictEqual(user.id.table, user);
        strictEqual(user.name.table, user);
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
    strictEqual(cols.length, 2);
    strictEqual(cols[0].name, 'id');
    assert(cols[0] === table.theId, 'Expected table.theId to be the first column');
    // @ts-ignore id doesn't exist
    assert(table.id === undefined, 'Expected table.id to not exist');
    strictEqual(cols[1].name, 'email');
    assert(cols[1] === table.uniqueEmail, 'Expected table.uniqueEmail to be the second column');
    // @ts-ignore email doesn't exist
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
    strictEqual(cols.length, 2);
    const id = cols[0];
    strictEqual(id.name, 'id');
    strictEqual(id.dataType, 'serial');
    strictEqual(id.notNull, true);
    strictEqual(id.primaryKey, true);
    const email = cols[1];
    strictEqual(email.name, 'email');
    strictEqual(email.dataType, 'text');
    strictEqual(email.notNull, true);
    strictEqual(email.unique, true);
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
    strictEqual(cols.length, 2);
    const id = cols[0];
    strictEqual(id.name, 'id');
    strictEqual(id.dataType, 'serial');
    strictEqual(id.notNull, true);
    strictEqual(id.primaryKey, true);
    const email = cols[1];
    strictEqual(email.name, 'email');
    strictEqual(email.dataType, 'text');
    strictEqual(email.notNull, true);
    strictEqual(email.unique, true);
});

test('table with dynamic column definition', function() {
    const table = Table.define({ name: 'foo', columns: [] });
    strictEqual(table.columns.length, 0);

    table.addColumn('foo');
    strictEqual(table.columns.length, 1);

    throws(function() {
        table.addColumn('foo');
    });

    doesNotThrow(function() {
        table.addColumn('foo', { noisy: false });
    });

    strictEqual(table.columns.length, 1);
});

test('hasColumn', function() {
    const table = Table.define({ name: 'foo', columns: [] });

    strictEqual(table.hasColumn('baz'), false);
    table.addColumn('baz');
    strictEqual(table.hasColumn('baz'), true);
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

    strictEqual(table.hasColumn('id'), true);
    strictEqual(table.hasColumn('theId'), true);
});

test('the column "from" does not overwrite the from method', function() {
    const table = Table.define({ name: 'foo', columns: [] });
    table.addColumn('from');
    strictEqual(typeof table.from, 'function');
});

test('getColumn returns the from column', function() {
    const table = Table.define({ name: 'foo', columns: [] });
    table.addColumn('from');
    assert(table.getColumn('from') instanceof Column);
    assert(table.get('from') instanceof Column);
});

test('set and get schema', function() {
    const table = Table.define({ name: 'foo', schema: 'bar', columns: [] });
    strictEqual(table.getSchema(), 'bar');
    table.setSchema('barbarz');
    strictEqual(table.getSchema(), 'barbarz');
});

suite('table.clone', function() {
    test('check if it is a copy, not just a reference', function() {
        const table = Table.define({ name: 'foo', columns: [] });
        const copy = table.clone();
        notStrictEqual(table, copy);
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

        strictEqual(copy.getSchema(), 'test');
        strictEqual(copy.snakeToCamel, false);
        strictEqual(copy.columnWhiteList, false);
    });
});

test('dialects', function() {
    const sql1 = new Sql('mysql');
    const foo1 = sql1.define<{ id: number }>({ name: 'foo', columns: ['id'] });
    const bar1 = sql1.define<{ id: number }>({ name: 'bar', columns: ['id'] });

    const actual1 = foo1
        .join(bar1)
        .on(bar1.id.equals(1))
        .toString();
    strictEqual(actual1, '`foo` INNER JOIN `bar` ON (`bar`.`id` = 1)');

    const sql2 = new Sql('postgres');
    const foo2 = sql2.define<{ id: number }>({ name: 'foo', columns: ['id'] });
    const bar2 = sql2.define<{ id: number }>({ name: 'bar', columns: ['id'] });
    const actual2 = foo2
        .join(bar2)
        .on(bar2.id.equals(1))
        .toString();
    strictEqual(actual2, '"foo" INNER JOIN "bar" ON ("bar"."id" = 1)');
});

test('limit', function() {
    const user = Table.define({ name: 'user', columns: ['id', 'name'] });
    const query = user.limit(3);
    strictEqual(query.nodes.length, 1);
    strictEqual(query.nodes[0].type, 'LIMIT');
    strictEqual(((query.nodes[0] as ModifierNode).count as ParameterNode).value(), 3);
});

test('offset', function() {
    const user = Table.define({ name: 'user', columns: ['id', 'name'] });
    const query = user.offset(20);
    strictEqual(query.nodes.length, 1);
    strictEqual(query.nodes[0].type, 'OFFSET');
    strictEqual(((query.nodes[0] as ModifierNode).count as ParameterNode).value(), 20);
});

test('order', function() {
    const user = Table.define<{ id: number; name: string }>({ name: 'user', columns: ['id', 'name'] });
    const query = user.order(user.name);
    strictEqual(query.nodes.length, 1);
    strictEqual(query.nodes[0].type, 'ORDER BY');
});
