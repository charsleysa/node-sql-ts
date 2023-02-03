'use strict';

import * as Harness from './support';
const user = Harness.defineUserTable();
const customerAlias = Harness.defineCustomerAliasTable();

Harness.test({
    query: user.select().distinctOn(user.id),
    pg: {
        text: 'SELECT DISTINCT ON("user"."id") "user".* FROM "user"',
        string: 'SELECT DISTINCT ON("user"."id") "user".* FROM "user"'
    },
    params: []
});

Harness.test({
    query: customerAlias.select().distinctOn(customerAlias.id_alias),
    pg: {
        text: 'SELECT DISTINCT ON("customer"."id") "customer"."id" AS "id_alias", "customer"."name" AS "name_alias", "customer"."age" AS "age_alias", "customer"."income" AS "income_alias", "customer"."metadata" AS "metadata_alias" FROM "customer"',
        string: 'SELECT DISTINCT ON("customer"."id") "customer"."id" AS "id_alias", "customer"."name" AS "name_alias", "customer"."age" AS "age_alias", "customer"."income" AS "income_alias", "customer"."metadata" AS "metadata_alias" FROM "customer"'
    },
    params: []
});

Harness.test({
    query: customerAlias.select(customerAlias.id_alias, customerAlias.name_alias).distinctOn(customerAlias.id_alias),
    pg: {
        text: 'SELECT DISTINCT ON("customer"."id") "customer"."id" AS "id_alias", "customer"."name" AS "name_alias" FROM "customer"',
        string: 'SELECT DISTINCT ON("customer"."id") "customer"."id" AS "id_alias", "customer"."name" AS "name_alias" FROM "customer"'
    },
    params: []
});
