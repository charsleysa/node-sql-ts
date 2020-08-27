'use strict';

import { strictEqual } from 'assert';
import { Table } from '../lib/table';

const Foo = Table.define<{ baz: string; bar: string }>({
    name: 'foo',
    columns: ['baz', 'bar']
});

test('operators', function() {
    strictEqual(Foo.baz.equals(1).operator, '=');
    strictEqual(Foo.baz.notEquals(1).operator, '<>');
    strictEqual(Foo.baz.like('asdf').operator, 'LIKE');
    strictEqual(Foo.baz.notLike('asdf').operator, 'NOT LIKE');
    strictEqual(Foo.baz.isNull().operator, 'IS NULL');
    strictEqual(Foo.baz.isNotNull().operator, 'IS NOT NULL');
    strictEqual(Foo.baz.gt(1).operator, '>');
    strictEqual(Foo.baz.gte(1).operator, '>=');
    strictEqual(Foo.baz.lt(1).operator, '<');
    strictEqual(Foo.baz.lte(1).operator, '<=');
    strictEqual(Foo.baz.plus(1).operator, '+');
    strictEqual(Foo.baz.minus(1).operator, '-');
    strictEqual(Foo.baz.multiply(1).operator, '*');
    strictEqual(Foo.baz.leftShift(1).operator, '<<');
    strictEqual(Foo.baz.rightShift(1).operator, '>>');
    strictEqual(Foo.baz.bitwiseAnd(1).operator, '&');
    strictEqual(Foo.baz.bitwiseNot(1).operator, '~');
    strictEqual(Foo.baz.bitwiseOr(1).operator, '|');
    strictEqual(Foo.baz.bitwiseXor(1).operator, '#');
    strictEqual(Foo.baz.divide(1).operator, '/');
    strictEqual(Foo.baz.modulo(1).operator, '%');
    strictEqual(Foo.baz.regex(1).operator, '~');
    strictEqual(Foo.baz.iregex(1).operator, '~*');
    strictEqual(Foo.baz.notRegex(1).operator, '!~');
    strictEqual(Foo.baz.notIregex(1).operator, '!~*');
    strictEqual(Foo.baz.regexp(1).operator, 'REGEXP');
    strictEqual(Foo.baz.rlike(1).operator, 'RLIKE');
    strictEqual(Foo.baz.ilike('asdf').operator, 'ILIKE');
    strictEqual(Foo.baz.notIlike('asdf').operator, 'NOT ILIKE');
    strictEqual(Foo.baz.match('asdf').operator, '@@');
});
