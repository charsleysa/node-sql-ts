import { strictEqual } from 'assert';

import { Sql } from '../dist/lib.js';
const instance = new Sql('postgres');

const user = instance.define<{ id: string; email: string; name: string; howOld: number }>({
    name: 'user',
    columns: [{ name: 'id' }, { name: 'email' }, { name: 'name' }, { name: 'age', property: 'howOld' }]
});

suite('operator', function() {
    // PREFIX UNARY
    test('creating a prefix unary operator works', function() {
        const not = instance.prefixUnaryOperator('NOT');
        const operator = not(user.id).toQuery();

        strictEqual(operator.text, '(NOT "user"."id")');
    });

    test('creating a prefix unary operator works with a parameter', function() {
        const not = instance.prefixUnaryOperator('NOT');
        const operator = not('hello').toQuery();

        strictEqual(operator.text, '(NOT $1)');
        strictEqual(operator.values[0], 'hello');
    });

    test('creating a prefix unary operator works via the mixin', function() {
        const operator = user.id.prefixUnaryOperator('NOT').toQuery();

        strictEqual(operator.text, '(NOT "user"."id")');
    });

    // POSTFIX UNARY
    test('creating a postfix unary operator works', function() {
        const isNull = instance.postfixUnaryOperator('IS NULL');
        const operator = isNull(user.id).toQuery();

        strictEqual(operator.text, '("user"."id" IS NULL)');
    });

    test('creating a postfix unary operator works with a parameter', function() {
        const isNull = instance.postfixUnaryOperator('IS NULL');
        const operator = isNull('hello').toQuery();

        strictEqual(operator.text, '($1 IS NULL)');
        strictEqual(operator.values[0], 'hello');
    });

    test('creating a postfix unary operator works via the mixin', function() {
        const operator = user.id.postfixUnaryOperator('IS NOT NULL').toQuery();

        strictEqual(operator.text, '("user"."id" IS NOT NULL)');
    });

    // BINARY
    test('creating a binary operator works', function() {
        const lt = instance.binaryOperator('<');
        const operator = lt(user.id, 3).toQuery();

        strictEqual(operator.text, '("user"."id" < $1)');
        strictEqual(operator.values[0], 3);
    });

    test('creating a binary operator works via the mixin', function() {
        const operator = user.id.binaryOperator('<->', 3).toQuery();

        strictEqual(operator.text, '("user"."id" <-> $1)');
        strictEqual(operator.values[0], 3);
    });

    // TERNARY
    test('creating a ternary operator works', function() {
        const between = instance.ternaryOperator('BETWEEN', 'AND');
        const operator = between(user.id, 3, user.id).toQuery();

        strictEqual(operator.text, '("user"."id" BETWEEN $1 AND "user"."id")');
        strictEqual(operator.values[0], 3);
    });

    test('creating a ternary operator works via the mixin', function() {
        const operator = user.id.ternaryOperator('BETWEEN', 3, 'AND', user.id).toQuery();

        strictEqual(operator.text, '("user"."id" BETWEEN $1 AND "user"."id")');
        strictEqual(operator.values[0], 3);
    });
});
