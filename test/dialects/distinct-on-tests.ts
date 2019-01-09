'use strict';

import * as Harness from './support';
const user = Harness.defineUserTable();

Harness.test({
    query: user.select().distinctOn(user.id),
    pg: {
        text: 'SELECT DISTINCT ON("user"."id") "user".* FROM "user"',
        string: 'SELECT DISTINCT ON("user"."id") "user".* FROM "user"'
    },
    params: []
});

Harness.test({
    query: user.select(user.id, user.name).distinctOn(user.id),
    pg: {
        text: 'SELECT DISTINCT ON("user"."id") "user"."id", "user"."name" FROM "user"',
        string: 'SELECT DISTINCT ON("user"."id") "user"."id", "user"."name" FROM "user"'
    },
    params: []
});
