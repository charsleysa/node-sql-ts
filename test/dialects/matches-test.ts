'use strict';

import * as Harness from './support';
import { Sql } from '../../lib';
const post = Harness.definePostTable();
const instance = new Sql('postgres');

// Postgres needs the to_tsquery function to use with @@ operator
Harness.test({
    query: post.select(post.star()).where(post.content.match(instance.functions.TO_TSQUERY('hello'))),
    pg: {
        text: 'SELECT "post".* FROM "post" WHERE ("post"."content" @@ TO_TSQUERY($1))',
        string: 'SELECT "post".* FROM "post" WHERE ("post"."content" @@ TO_TSQUERY(\'hello\'))'
    },
    params: ['hello']
});

Harness.test({
    query: post.select(post.star()).where(post.content.match('hello')),
    sqlite: {
        text: 'SELECT "post".* FROM "post" WHERE ("post"."content" MATCH $1)',
        string: 'SELECT "post".* FROM "post" WHERE ("post"."content" MATCH \'hello\')'
    },
    mysql: {
        text: 'SELECT `post`.* FROM `post` WHERE (MATCH `post`.`content` AGAINST ?)',
        string: "SELECT `post`.* FROM `post` WHERE (MATCH `post`.`content` AGAINST 'hello')"
    },
    mssql: {
        text: 'SELECT [post].* FROM [post] WHERE (CONTAINS ([post].[content], @1))',
        string: "SELECT [post].* FROM [post] WHERE (CONTAINS ([post].[content], 'hello'))"
    },
    oracle: {
        text: 'SELECT "post".* FROM "post" WHERE (INSTR ("post"."content", :1) > 0)',
        string: 'SELECT "post".* FROM "post" WHERE (INSTR ("post"."content", \'hello\') > 0)'
    },
    params: ['hello']
});

// matches, ordered by best rank first
Harness.test({
    query: post
        .select(post.id, instance.functions.TS_RANK_CD(post.content, instance.functions.TO_TSQUERY('hello')).as('rank'))
        .where(post.content.match(instance.functions.TO_TSQUERY('hello')))
        .order(instance.functions.TS_RANK_CD(post.content, instance.functions.TO_TSQUERY('hello')).descending()),
    pg: {
        text:
            'SELECT "post"."id", TS_RANK_CD("post"."content", TO_TSQUERY($1)) AS "rank" FROM "post" WHERE ("post"."content" @@ TO_TSQUERY($2)) ORDER BY TS_RANK_CD("post"."content", TO_TSQUERY($3)) DESC',
        string:
            'SELECT "post"."id", TS_RANK_CD("post"."content", TO_TSQUERY(\'hello\')) AS "rank" FROM "post" WHERE ("post"."content" @@ TO_TSQUERY(\'hello\')) ORDER BY TS_RANK_CD("post"."content", TO_TSQUERY(\'hello\')) DESC'
    },
    params: ['hello', 'hello', 'hello']
});
