'use strict';
import assert from 'assert';

import { Mssql } from '../../lib/dialect/mssql';
import { Mysql } from '../../lib/dialect/mysql';
import { Oracle } from '../../lib/dialect/oracle';
import { Postgres } from '../../lib/dialect/postgres';
import { Sqlite } from '../../lib/dialect/sqlite';
import { Table } from '../../lib/table';

// specify dialect classes
const dialects = {
    pg: Postgres,
    sqlite: Sqlite,
    mysql: Mysql,
    mssql: Mssql,
    oracle: Oracle
};

function customTest(expected: any) {
    // for each dialect
    Object.keys(dialects).forEach(function(dialect) {
        const expectedObject = expected[dialect];
        if (undefined !== expectedObject) {
            const DialectClass = (dialects as any)[dialect];

            const title = dialect + ': ' + (expected.title || expectedObject.text || expectedObject);
            test(title, function() {
                // check if this query is expected to throw
                if (expectedObject.throws) {
                    assert.throws(function() {
                        new DialectClass(expectedObject.config || {}).getQuery(expected.query);
                    });
                } else {
                    // build query for dialect
                    const compiledQuery = new DialectClass(expectedObject.config || {}).getQuery(expected.query);

                    // test result is correct
                    const expectedText = expectedObject.text || expectedObject;
                    assert.strictEqual(compiledQuery.text, expectedText);

                    // if params are specified then test these are correct
                    const expectedParams = expectedObject.params || expected.params;
                    if (undefined !== expectedParams) {
                        assert.strictEqual(expectedParams.length, compiledQuery.values.length, 'params length');
                        for (let i = 0; i < expectedParams.length; i++) {
                            assert.deepStrictEqual(expectedParams[i], compiledQuery.values[i], 'param ' + (i + 1));
                        }
                    }
                }

                if (undefined !== expectedObject.string) {
                    // test the toString
                    if (expectedObject.throws) {
                        assert.throws(function() {
                            new DialectClass(expectedObject.config || {}).getString(expected.query);
                        });
                    } else {
                        const compiledString = new DialectClass(expectedObject.config || {}).getString(expected.query);

                        // test result is correct
                        assert.strictEqual(compiledString, expectedObject.string);
                    }
                }
            });
        } // if
    }); // forEach
}

export interface UserTable {
    id: number;
    name: string;
}

export function defineUserTable() {
    return Table.define<UserTable>({
        name: 'user',
        columns: ['id', 'name']
    });
}

export interface PostTable {
    id: number;
    userId: number;
    content: string | null;
    tags: string;
    length: number;
}

export function definePostTable() {
    return Table.define<PostTable>({
        name: 'post',
        columns: ['id', 'userId', 'content', 'tags', 'length']
    });
}

export interface CommentTable {
    postId: number;
    text: string;
}

export function defineCommentTable() {
    return Table.define<CommentTable>({
        name: 'comment',
        columns: ['postId', 'text']
    });
}

export interface CustomerTable {
    id: number;
    name: string;
    age: number;
    income: number;
    metadata: object;
}

export function defineCustomerTable() {
    return Table.define<CustomerTable>({
        name: 'customer',
        columns: ['id', 'name', 'age', 'income', 'metadata']
    });
}

export interface CustomerCompositeTable {
    id: number;
    info: object;
}

// This table defines the customer attributes as a composite field
export function defineCustomerCompositeTable() {
    return Table.define<CustomerCompositeTable>({
        name: 'customer',
        columns: {
            id: {},
            info: { subfields: ['name', 'age', 'salary'] }
        }
    });
}

export interface CustomerAliasTable {
    id_alias: number;
    name_alias: string;
    age_alias: number;
    income_alias: number;
    metadata_alias: object;
}

export function defineCustomerAliasTable() {
    return Table.define<CustomerAliasTable>({
        name: 'customer',
        columns: {
            id: { property: 'id_alias' },
            name: { property: 'name_alias' },
            age: { property: 'age_alias' },
            income: { property: 'income_alias' },
            metadata: { property: 'metadata_alias' }
        }
    });
}

export interface VariableTable {
    a: any;
    b: any;
    c: any;
    d: any;
    t: any;
    u: any;
    v: any;
    x: any;
    y: any;
    z: any;
}

// This table contains column names that correspond to popularly used variables in formulas.
export function defineVariableTable() {
    return Table.define<VariableTable>({
        name: 'variable',
        columns: ['a', 'b', 'c', 'd', 't', 'u', 'v', 'x', 'y', 'z']
    });
}

export interface ContentTable {
    contentId: number;
    text: string;
    contentPosts: string;
}

// this table is for testing snakeName related stuff
export function defineContentTable() {
    return Table.define<ContentTable>({
        name: 'content',
        columns: ['content_id', 'text', 'content_posts'],
        snakeToCamel: true
    });
}

export { customTest as test };
