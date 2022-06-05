import { strictEqual } from 'assert';

import { Table, TernaryNode } from '../dist/lib.js';

const Foo = Table.define<{ baz: string | number; bar: string | number }>({
    name: 'foo',
    columns: ['baz', 'bar'],
});

const existingPostfixUnaryOperators = {
    isNull: ['IS NULL'],
    isNotNull: ['IS NOT NULL'],
};

const existingBinaryOperators = {
    equals: ['=', 1],
    notEquals: ['<>', 1],
    like: ['LIKE', 'asdf'],
    notLike: ['NOT LIKE', 'asdf'],
    gt: ['>', 1],
    gte: ['>=', 1],
    lt: ['<', 1],
    lte: ['<=', 1],
    plus: ['+', 1],
    minus: ['-', 1],
    multiply: ['*', 1],
    leftShift: ['<<', 1],
    rightShift: ['>>', 1],
    bitwiseAnd: ['&', 1],
    bitwiseNot: ['~', 1],
    bitwiseOr: ['|', 1],
    bitwiseXor: ['#', 1],
    divide: ['/', 1],
    modulo: ['%', 1],
    regex: ['~', 1],
    iregex: ['~*', 1],
    notRegex: ['!~', 1],
    notIregex: ['!~*', 1],
    regexp: ['REGEXP', 1],
    rlike: ['RLIKE', 1],
    ilike: ['ILIKE', 'asdf'],
    notIlike: ['NOT ILIKE', 'asdf'],
    match: ['@@', 'asdf'],
};

const existingTernaryOperators = {
    between: ['BETWEEN', 'AND', 1, 2],
};

function keys<T>(obj: T) {
    return Object.keys(obj) as (keyof T)[];
}

// Examples:
// "Foo.select(Foo.baz.op('IS NOT NULL')())" is equivalent to:
// "Foo.select(Foo.baz.isNotNull())"
// 'SELECT ("foo"."baz" IS NOT NULL) FROM "foo"'
//
// "Foo.select(Foo.baz.op('>')(1))" is equivalent to:
// "Foo.select(Foo.baz.gt(1))"
// 'SELECT ("foo"."baz" > 1) FROM "foo"'
//
// "Foo.select(Foo.baz.op('BETWEEN', 'AND')(1, 2))" is equivalent to:
// "Foo.select(Foo.baz.between(1, 2))"
// 'SELECT ("foo"."baz" BETWEEN 1 AND 2) FROM "foo"'

suite('generic operators', function () {
    test('matches functionality for existing postfix unary operators', function () {
        for (const name of keys(existingPostfixUnaryOperators)) {
            const [operator] = existingPostfixUnaryOperators[name];
            const comparison = Foo.baz.op(operator)();
            const query = Foo.select(comparison).toQuery();
            strictEqual(comparison.operator, operator);
            strictEqual(query.text, Foo.select(Foo.baz[name]()).toQuery().text);
        }
    });

    test('matches functionality for existing binary operators', function () {
        for (const name of keys(existingBinaryOperators)) {
            const [operator, value] = existingBinaryOperators[name] as [string, any];
            const comparison = Foo.baz.op(operator)(value);
            const query = Foo.select(comparison).toQuery();
            strictEqual(comparison.operator, operator);
            strictEqual(query.text, Foo.select(Foo.baz[name](value)).toQuery().text);
            strictEqual(query.values[0], value);
        }
    });

    test('matches functionality for existing ternary operators', function () {
        for (const name of keys(existingTernaryOperators)) {
            const [operator, separator, value1, value2] = existingTernaryOperators[name] as [string, string, any, any];
            const comparison = Foo.baz.op(operator, separator)(value1, value2) as TernaryNode;
            const query = Foo.select(comparison).toQuery();
            const specificQuery = Foo.select(Foo.baz[name](value1, value2)).toQuery();
            strictEqual(comparison.operator, operator);
            strictEqual(comparison.separator, separator);
            strictEqual(query.text, specificQuery.text);
            strictEqual(query.values[0], value1);
            strictEqual(query.values[1], value2);
        }
    });

    test('can use a custom prefix unary operator', function () {
        const query = Foo.select(Foo.baz.preOp('BAR')()).toQuery();

        strictEqual(query.text, 'SELECT (BAR "foo"."baz") FROM "foo"');
    });

    test('can use a custom postfix unary operator', function () {
        const query = Foo.select(Foo.baz.op('BAR')()).toQuery();

        strictEqual(query.text, 'SELECT ("foo"."baz" BAR) FROM "foo"');
    });

    test('can use a custom binary operator', function () {
        const query = Foo.select(Foo.baz.op('BAR')(1)).toQuery();

        strictEqual(query.text, 'SELECT ("foo"."baz" BAR $1) FROM "foo"');
        strictEqual(query.values[0], 1);
    });

    test('can use the distance operator from pg_trgm', function () {
        const query = Foo.select(Foo.baz.op('<->')('asdf')).toQuery();

        strictEqual(query.text, 'SELECT ("foo"."baz" <-> $1) FROM "foo"');
        strictEqual(query.values[0], 'asdf');
    });

    test('can use a custom ternary operator', function () {
        const query = Foo.select(Foo.baz.op('BAR', 'BAT')(1, 2)).toQuery();

        strictEqual(query.text, 'SELECT ("foo"."baz" BAR $1 BAT $2) FROM "foo"');
        strictEqual(query.values[0], 1);
        strictEqual(query.values[1], 2);
    });
});
