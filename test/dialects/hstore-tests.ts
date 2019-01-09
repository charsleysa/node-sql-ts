'use strict';

import * as Harness from './support';
import { Sql } from '../../lib';
const customer = Harness.defineCustomerTable();
const instance = new Sql('postgres');

Harness.test({
    query: customer.update({
        metadata: customer.metadata.concat(instance.functions.HSTORE('age', 20))
    }),
    pg: {
        text: 'UPDATE "customer" SET "metadata" = ("customer"."metadata" || HSTORE($1, $2))',
        string: 'UPDATE "customer" SET "metadata" = ("customer"."metadata" || HSTORE(\'age\', 20))'
    },
    params: ['age', 20]
});

Harness.test({
    query: customer.select(customer.metadata.key('age')),
    pg: {
        text: 'SELECT ("customer"."metadata" -> $1) FROM "customer"',
        string: 'SELECT ("customer"."metadata" -> \'age\') FROM "customer"'
    },
    params: ['age']
});
