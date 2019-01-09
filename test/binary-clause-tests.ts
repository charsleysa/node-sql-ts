'use strict';

import { equal } from 'assert';
import { Table } from '../lib/table';

const Foo = Table.define<{ baz: string; bar: string }>({
    name: 'foo',
    columns: ['baz', 'bar']
});

test('operators', function() {
    equal(Foo.baz.equals(1).operator, '=');
    equal(Foo.baz.equal(1).operator, '=');
    equal(Foo.baz.notEqual(1).operator, '<>');
    equal(Foo.baz.notEquals(1).operator, '<>');
    equal(Foo.baz.like('asdf').operator, 'LIKE');
    equal(Foo.baz.notLike('asdf').operator, 'NOT LIKE');
    equal(Foo.baz.isNull().operator, 'IS NULL');
    equal(Foo.baz.isNotNull().operator, 'IS NOT NULL');
    equal(Foo.baz.gt(1).operator, '>');
    equal(Foo.baz.gte(1).operator, '>=');
    equal(Foo.baz.lt(1).operator, '<');
    equal(Foo.baz.lte(1).operator, '<=');
    equal(Foo.baz.plus(1).operator, '+');
    equal(Foo.baz.minus(1).operator, '-');
    equal(Foo.baz.multiply(1).operator, '*');
    equal(Foo.baz.leftShift(1).operator, '<<');
    equal(Foo.baz.rightShift(1).operator, '>>');
    equal(Foo.baz.bitwiseAnd(1).operator, '&');
    equal(Foo.baz.bitwiseNot(1).operator, '~');
    equal(Foo.baz.bitwiseOr(1).operator, '|');
    equal(Foo.baz.bitwiseXor(1).operator, '#');
    equal(Foo.baz.divide(1).operator, '/');
    equal(Foo.baz.modulo(1).operator, '%');
    equal(Foo.baz.regex(1).operator, '~');
    equal(Foo.baz.iregex(1).operator, '~*');
    equal(Foo.baz.notRegex(1).operator, '!~');
    equal(Foo.baz.notIregex(1).operator, '!~*');
    equal(Foo.baz.regexp(1).operator, 'REGEXP');
    equal(Foo.baz.rlike(1).operator, 'RLIKE');
    equal(Foo.baz.ilike('asdf').operator, 'ILIKE');
    equal(Foo.baz.notIlike('asdf').operator, 'NOT ILIKE');
    equal(Foo.baz.match('asdf').operator, '@@');
});
