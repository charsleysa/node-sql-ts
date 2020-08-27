'use strict';
import { strictEqual } from 'assert';

import { Sql } from '../lib';
const instance = new Sql('postgres');

const user = instance.define<{ id: string; email: string; name: string; howOld: number }>({
    name: 'user',
    columns: [{ name: 'id' }, { name: 'email' }, { name: 'name' }, { name: 'age', property: 'howOld' }]
});

suite('function', function() {
    test('alias function call', function() {
        const upper = instance.functions.UPPER;
        const aliasedUpper = upper(user.email)
            .as('upperAlias')
            .toQuery();

        strictEqual(aliasedUpper.text, 'UPPER("user"."email") AS "upperAlias"');
    });

    test('function call on aliased column', function() {
        const round = instance.functions.ROUND;
        const aliasedRound = round(user.howOld, 2).toQuery();

        strictEqual(aliasedRound.text, 'ROUND("user"."age", $1)');
        strictEqual(aliasedRound.values[0], 2);
    });

    test('creating function call works', function() {
        const upper = instance.function('UPPER');
        const functionCall = upper('hello', 'world').toQuery();

        strictEqual(functionCall.text, 'UPPER($1, $2)');
        strictEqual(functionCall.values[0], 'hello');
        strictEqual(functionCall.values[1], 'world');
    });

    test('creating function call on columns works', function() {
        const upper = instance.function('UPPER');
        const functionCall = upper(user.id, user.email).toQuery();

        strictEqual(functionCall.text, 'UPPER("user"."id", "user"."email")');
        strictEqual(functionCall.values.length, 0);
    });

    test('function call inside select works', function() {
        const upper = instance.function('UPPER');
        const query = instance
            .select(upper(user.id, user.email))
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toQuery();

        strictEqual(query.text, 'SELECT UPPER("user"."id", "user"."email") FROM "user" WHERE ("user"."email" = $1)');
        strictEqual(query.values[0], 'brian.m.carlson@gmail.com');
    });

    test('standard aggregate functions with having clause', function() {
        const count = instance.functions.COUNT;
        const distinct = instance.functions.DISTINCT;
        const distinctEmailCount = count(distinct(user.email));

        const query = user
            .select(user.id, distinctEmailCount)
            .group(user.id)
            .having(distinctEmailCount.gt(100))
            .toQuery();

        strictEqual(
            query.text,
            'SELECT "user"."id", COUNT(DISTINCT("user"."email")) FROM "user" GROUP BY "user"."id" HAVING (COUNT(DISTINCT("user"."email")) > $1)'
        );
        strictEqual(query.values[0], 100);
    });

    test('custom and standard functions behave the same', function() {
        const standardUpper = instance.functions.UPPER;
        const customUpper = instance.function('UPPER');

        const standardQuery = user.select(standardUpper(user.name)).toQuery();
        const customQuery = user.select(customUpper(user.name)).toQuery();

        const expectedQuery = 'SELECT UPPER("user"."name") FROM "user"';
        strictEqual(standardQuery.text, expectedQuery);
        strictEqual(customQuery.text, expectedQuery);
    });

    test('combine function with operations', function() {
        const f = instance.functions;
        const query = user.select(f.AVG(f.DISTINCT(f.COUNT(user.id).plus(f.MAX(user.id))).minus(f.MIN(user.id))).multiply(100)).toQuery();

        strictEqual(query.text, 'SELECT (AVG((DISTINCT((COUNT("user"."id") + MAX("user"."id"))) - MIN("user"."id"))) * $1) FROM "user"');
        strictEqual(query.values[0], 100);
    });

    test('use custom function', function() {
        const query = user.select(instance.function('PHRASE_TO_TSQUERY')('simple', user.name)).toQuery();
        strictEqual(query.text, 'SELECT PHRASE_TO_TSQUERY($1, "user"."name") FROM "user"');
        strictEqual(query.values[0], 'simple');
    });
});
