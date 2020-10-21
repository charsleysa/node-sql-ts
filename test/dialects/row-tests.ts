'use strict';

import * as Harness from './support';
import { Sql } from '../../lib';
const post = Harness.definePostTable();
const instance = new Sql('postgres');

// Array columns
Harness.test({
    query: instance.row(post.userId, 'some new content', instance.array('nodejs')),
    pg: {
        text: '("post"."userId", $1, ARRAY[$2])',
        string: '("post"."userId", \'some new content\', ARRAY[\'nodejs\'])'
    },
    params: ['some new content', 'nodejs']
});

Harness.test({
    query: post.select(post.star()).where(instance.row(post.userId, post.content).equals(instance.row(1234, 'some new content'))),
    pg: {
        text: 'SELECT "post".* FROM "post" WHERE (("post"."userId", "post"."content") = ($1, $2))',
        string: 'SELECT "post".* FROM "post" WHERE (("post"."userId", "post"."content") = (1234, \'some new content\'))'
    },
    params: [1234, 'some new content']
});

Harness.test({
    query: post.select(post.star()).where(instance.row(post.userId, post.content).in([instance.row(1234, 'some new content'), instance.row(5678, 'some other content')])),
    pg: {
        text: 'SELECT "post".* FROM "post" WHERE (("post"."userId", "post"."content") IN (($1, $2), ($3, $4)))',
        string: 'SELECT "post".* FROM "post" WHERE (("post"."userId", "post"."content") IN ((1234, \'some new content\'), (5678, \'some other content\')))'
    },
    params: [1234, 'some new content', 5678, 'some other content']
});
