'use strict';

import * as Harness from './support';
const customerComposite = Harness.defineCustomerCompositeTable();

Harness.test({
    query: customerComposite.select(customerComposite.info.subfields.age),
    pg: {
        text: 'SELECT ("customer"."info")."age" FROM "customer"',
        string: 'SELECT ("customer"."info")."age" FROM "customer"'
    },
    params: []
});

Harness.test({
    query: customerComposite.select(customerComposite.info.subfields.age.as('years')),
    pg: {
        text: 'SELECT ("customer"."info")."age" AS "years" FROM "customer"',
        string: 'SELECT ("customer"."info")."age" AS "years" FROM "customer"'
    },
    params: []
});

Harness.test({
    query: customerComposite.select(customerComposite.id).where(customerComposite.info.subfields.salary.equals(10)),
    pg: {
        text: 'SELECT "customer"."id" FROM "customer" WHERE (("customer"."info")."salary" = $1)',
        string: 'SELECT "customer"."id" FROM "customer" WHERE (("customer"."info")."salary" = 10)'
    },
    params: [10]
});

Harness.test({
    query: customerComposite.select(customerComposite.info.subfields.name.distinct()),
    pg: {
        text: 'SELECT DISTINCT(("customer"."info")."name") FROM "customer"',
        string: 'SELECT DISTINCT(("customer"."info")."name") FROM "customer"'
    },
    params: []
});
