'use strict';

import * as Harness from './support';
import { Sql } from '../../lib';
const post = Harness.definePostTable();
const instance = new Sql('postgres');

// Array columns
Harness.test({
    query: post.update({
        tags: post.tags.concat(instance.array('nodejs'))
    }),
    pg: {
        text: 'UPDATE "post" SET "tags" = ("post"."tags" || ARRAY[$1])',
        string: 'UPDATE "post" SET "tags" = ("post"."tags" || ARRAY[\'nodejs\'])'
    },
    params: ['nodejs']
});

Harness.test({
    query: post.select(post.tags.contains(instance.array('nodejs', 'js'))),
    pg: {
        text: 'SELECT ("post"."tags" @> ARRAY[$1, $2]) FROM "post"',
        string: 'SELECT ("post"."tags" @> ARRAY[\'nodejs\', \'js\']) FROM "post"'
    },
    params: ['nodejs', 'js']
});

Harness.test({
    query: post.select(post.tags.containedBy(instance.array('nodejs', 'js'))),
    pg: {
        text: 'SELECT ("post"."tags" <@ ARRAY[$1, $2]) FROM "post"',
        string: 'SELECT ("post"."tags" <@ ARRAY[\'nodejs\', \'js\']) FROM "post"'
    },
    params: ['nodejs', 'js']
});

Harness.test({
    query: post.select(post.tags.overlap(instance.array('nodejs', 'js'))),
    pg: {
        text: 'SELECT ("post"."tags" && ARRAY[$1, $2]) FROM "post"',
        string: 'SELECT ("post"."tags" && ARRAY[\'nodejs\', \'js\']) FROM "post"'
    },
    params: ['nodejs', 'js']
});

Harness.test({
    query: post.select(post.tags.slice(2, 3)),
    pg: {
        text: 'SELECT ("post"."tags")[$1:$2] FROM "post"',
        string: 'SELECT ("post"."tags")[2:3] FROM "post"'
    },
    params: [2, 3]
});

Harness.test({
    query: post.select(post.tags.at(2)),
    pg: {
        text: 'SELECT ("post"."tags")[$1] FROM "post"',
        string: 'SELECT ("post"."tags")[2] FROM "post"'
    },
    params: [2]
});

// Array literals
Harness.test({
    query: post.select(instance.array(1, 2, 3)),
    pg: {
        text: 'SELECT ARRAY[$1, $2, $3] FROM "post"',
        string: 'SELECT ARRAY[1, 2, 3] FROM "post"'
    },
    params: [1, 2, 3]
});

Harness.test({
    query: post.select(instance.array(1, 2, 3).slice(2, 3)),
    pg: {
        text: 'SELECT (ARRAY[$1, $2, $3])[$4:$5] FROM "post"',
        string: 'SELECT (ARRAY[1, 2, 3])[2:3] FROM "post"'
    },
    params: [1, 2, 3, 2, 3]
});

Harness.test({
    query: post.select(instance.array(1, 2, 3).at(2)),
    pg: {
        text: 'SELECT (ARRAY[$1, $2, $3])[$4] FROM "post"',
        string: 'SELECT (ARRAY[1, 2, 3])[2] FROM "post"'
    },
    params: [1, 2, 3, 2]
});
