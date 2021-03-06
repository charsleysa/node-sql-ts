import * as Harness from './support.js';
import { Sql } from '../../dist/lib.js';
const customer = Harness.defineCustomerTable();
const post = Harness.definePostTable();
const user = Harness.defineUserTable();
const customerAlias = Harness.defineCustomerAliasTable();
const instance = new Sql('postgres');

Harness.test({
    query: user.select(user.name).where(user.id.in(post.select(post.userId))),
    pg: {
        text: 'SELECT "user"."name" FROM "user" WHERE ("user"."id" IN (SELECT "post"."userId" FROM "post"))',
        string: 'SELECT "user"."name" FROM "user" WHERE ("user"."id" IN (SELECT "post"."userId" FROM "post"))'
    },
    sqlite: {
        text: 'SELECT "user"."name" FROM "user" WHERE ("user"."id" IN (SELECT "post"."userId" FROM "post"))',
        string: 'SELECT "user"."name" FROM "user" WHERE ("user"."id" IN (SELECT "post"."userId" FROM "post"))'
    },
    mysql: {
        text: 'SELECT `user`.`name` FROM `user` WHERE (`user`.`id` IN (SELECT `post`.`userId` FROM `post`))',
        string: 'SELECT `user`.`name` FROM `user` WHERE (`user`.`id` IN (SELECT `post`.`userId` FROM `post`))'
    },
    mssql: {
        text: 'SELECT [user].[name] FROM [user] WHERE ([user].[id] IN (SELECT [post].[userId] FROM [post]))',
        string: 'SELECT [user].[name] FROM [user] WHERE ([user].[id] IN (SELECT [post].[userId] FROM [post]))'
    },
    oracle: {
        text: 'SELECT "user"."name" FROM "user" WHERE ("user"."id" IN (SELECT "post"."userId" FROM "post"))',
        string: 'SELECT "user"."name" FROM "user" WHERE ("user"."id" IN (SELECT "post"."userId" FROM "post"))'
    },
    params: []
});

Harness.test({
    query: user.name.in(
        customer
            .subQuery()
            .select(customer.name)
            .where(
                user.name.in(
                    customer
                        .subQuery()
                        .select(customer.name)
                        .where(user.name.like('%HELLO%'))
                )
            )
    ),
    pg: {
        text:
            '("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" LIKE $1)))))',
        string:
            '("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" LIKE \'%HELLO%\')))))'
    },
    sqlite: {
        text:
            '("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" LIKE $1)))))',
        string:
            '("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" LIKE \'%HELLO%\')))))'
    },
    mysql: {
        text:
            '(`user`.`name` IN (SELECT `customer`.`name` FROM `customer` WHERE (`user`.`name` IN (SELECT `customer`.`name` FROM `customer` WHERE (`user`.`name` LIKE ?)))))',
        string:
            "(`user`.`name` IN (SELECT `customer`.`name` FROM `customer` WHERE (`user`.`name` IN (SELECT `customer`.`name` FROM `customer` WHERE (`user`.`name` LIKE '%HELLO%')))))"
    },
    mssql: {
        text:
            '([user].[name] IN (SELECT [customer].[name] FROM [customer] WHERE ([user].[name] IN (SELECT [customer].[name] FROM [customer] WHERE ([user].[name] LIKE @1)))))',
        string:
            "([user].[name] IN (SELECT [customer].[name] FROM [customer] WHERE ([user].[name] IN (SELECT [customer].[name] FROM [customer] WHERE ([user].[name] LIKE '%HELLO%')))))"
    },
    oracle: {
        text:
            '("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" LIKE :1)))))',
        string:
            '("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" IN (SELECT "customer"."name" FROM "customer" WHERE ("user"."name" LIKE \'%HELLO%\')))))'
    },
    params: ['%HELLO%']
});

Harness.test({
    query: instance.select('*').from(user.subQuery()),
    pg: {
        text: 'SELECT * FROM (SELECT * FROM "user")',
        string: 'SELECT * FROM (SELECT * FROM "user")'
    },
    sqlite: {
        text: 'SELECT * FROM (SELECT * FROM "user")',
        string: 'SELECT * FROM (SELECT * FROM "user")'
    },
    mysql: {
        text: 'SELECT * FROM (SELECT * FROM `user`)',
        string: 'SELECT * FROM (SELECT * FROM `user`)'
    },
    mssql: {
        text: 'SELECT * FROM (SELECT * FROM [user])',
        string: 'SELECT * FROM (SELECT * FROM [user])'
    },
    oracle: {
        text: 'SELECT * FROM (SELECT * FROM "user")',
        string: 'SELECT * FROM (SELECT * FROM "user")'
    },
    params: []
});

// Subquery with a date
Harness.test({
    query: instance.select('*').from(post.subQuery().where(post.content.equals(new Date('Sat, 01 Jan 2000 00:00:00 GMT')))),
    pg: {
        text: 'SELECT * FROM (SELECT * FROM "post" WHERE ("post"."content" = $1))',
        string: 'SELECT * FROM (SELECT * FROM "post" WHERE ("post"."content" = \'2000-01-01T00:00:00.000Z\'))'
    },
    sqlite: {
        text: 'SELECT * FROM (SELECT * FROM "post" WHERE ("post"."content" = $1))',
        string: 'SELECT * FROM (SELECT * FROM "post" WHERE ("post"."content" = 946684800000))',
        config: {
            dateTimeMillis: true
        }
    },
    mysql: {
        text: 'SELECT * FROM (SELECT * FROM `post` WHERE (`post`.`content` = ?))',
        string: "SELECT * FROM (SELECT * FROM `post` WHERE (`post`.`content` = '2000-01-01T00:00:00.000Z'))"
    },
    mssql: {
        text: 'SELECT * FROM (SELECT * FROM [post] WHERE ([post].[content] = @1))',
        string: "SELECT * FROM (SELECT * FROM [post] WHERE ([post].[content] = '2000-01-01T00:00:00.000Z'))"
    },
    oracle: {
        text: 'SELECT * FROM (SELECT * FROM "post" WHERE ("post"."content" = :1))',
        string: 'SELECT * FROM (SELECT * FROM "post" WHERE ("post"."content" = \'2000-01-01T00:00:00.000Z\'))'
    },
    params: [new Date('Sat, 01 Jan 2000 00:00:00 GMT')]
});

Harness.test({
    query: instance
        .select('*')
        .from(customer.subQuery('T1'))
        .from(user.subQuery('T2')),
    pg: {
        text: 'SELECT * FROM (SELECT * FROM "customer") "T1" , (SELECT * FROM "user") "T2"',
        string: 'SELECT * FROM (SELECT * FROM "customer") "T1" , (SELECT * FROM "user") "T2"'
    },
    sqlite: {
        text: 'SELECT * FROM (SELECT * FROM "customer") "T1" , (SELECT * FROM "user") "T2"',
        string: 'SELECT * FROM (SELECT * FROM "customer") "T1" , (SELECT * FROM "user") "T2"'
    },
    mysql: {
        text: 'SELECT * FROM (SELECT * FROM `customer`) `T1` , (SELECT * FROM `user`) `T2`',
        string: 'SELECT * FROM (SELECT * FROM `customer`) `T1` , (SELECT * FROM `user`) `T2`'
    },
    mssql: {
        text: 'SELECT * FROM (SELECT * FROM [customer]) [T1] , (SELECT * FROM [user]) [T2]',
        string: 'SELECT * FROM (SELECT * FROM [customer]) [T1] , (SELECT * FROM [user]) [T2]'
    },
    oracle: {
        text: 'SELECT * FROM (SELECT * FROM "customer") "T1" , (SELECT * FROM "user") "T2"',
        string: 'SELECT * FROM (SELECT * FROM "customer") "T1" , (SELECT * FROM "user") "T2"'
    },
    params: []
});

Harness.test({
    query: customer.name.between(
        customer.subQuery().select(instance.functions.MIN(customer.name)),
        customer.subQuery().select(instance.functions.MAX(customer.name))
    ),
    pg: {
        text:
            '("customer"."name" BETWEEN (SELECT MIN("customer"."name") FROM "customer") AND (SELECT MAX("customer"."name") FROM "customer"))',
        string:
            '("customer"."name" BETWEEN (SELECT MIN("customer"."name") FROM "customer") AND (SELECT MAX("customer"."name") FROM "customer"))'
    },
    sqlite: {
        text:
            '("customer"."name" BETWEEN (SELECT MIN("customer"."name") FROM "customer") AND (SELECT MAX("customer"."name") FROM "customer"))',
        string:
            '("customer"."name" BETWEEN (SELECT MIN("customer"."name") FROM "customer") AND (SELECT MAX("customer"."name") FROM "customer"))'
    },
    mysql: {
        text:
            '(`customer`.`name` BETWEEN (SELECT MIN(`customer`.`name`) FROM `customer`) AND (SELECT MAX(`customer`.`name`) FROM `customer`))',
        string:
            '(`customer`.`name` BETWEEN (SELECT MIN(`customer`.`name`) FROM `customer`) AND (SELECT MAX(`customer`.`name`) FROM `customer`))'
    },
    mssql: {
        text:
            '([customer].[name] BETWEEN (SELECT MIN([customer].[name]) FROM [customer]) AND (SELECT MAX([customer].[name]) FROM [customer]))',
        string:
            '([customer].[name] BETWEEN (SELECT MIN([customer].[name]) FROM [customer]) AND (SELECT MAX([customer].[name]) FROM [customer]))'
    },
    oracle: {
        text:
            '("customer"."name" BETWEEN (SELECT MIN("customer"."name") FROM "customer") AND (SELECT MAX("customer"."name") FROM "customer"))',
        string:
            '("customer"."name" BETWEEN (SELECT MIN("customer"."name") FROM "customer") AND (SELECT MAX("customer"."name") FROM "customer"))'
    },
    params: []
});

Harness.test({
    query: user
        .subQuery()
        .where(user.name.equals(customer.name))
        .exists(),
    pg: {
        text: '(EXISTS (SELECT * FROM "user" WHERE ("user"."name" = "customer"."name")))',
        string: '(EXISTS (SELECT * FROM "user" WHERE ("user"."name" = "customer"."name")))'
    },
    sqlite: {
        text: '(EXISTS (SELECT * FROM "user" WHERE ("user"."name" = "customer"."name")))',
        string: '(EXISTS (SELECT * FROM "user" WHERE ("user"."name" = "customer"."name")))'
    },
    mysql: {
        text: '(EXISTS (SELECT * FROM `user` WHERE (`user`.`name` = `customer`.`name`)))',
        string: '(EXISTS (SELECT * FROM `user` WHERE (`user`.`name` = `customer`.`name`)))'
    },
    mssql: {
        text: '(EXISTS (SELECT * FROM [user] WHERE ([user].[name] = [customer].[name])))',
        string: '(EXISTS (SELECT * FROM [user] WHERE ([user].[name] = [customer].[name])))'
    },
    oracle: {
        text: '(EXISTS (SELECT * FROM "user" WHERE ("user"."name" = "customer"."name")))',
        string: '(EXISTS (SELECT * FROM "user" WHERE ("user"."name" = "customer"."name")))'
    },
    params: []
});

const limitUsers = user
    .subQuery<{ id: string, name: string }>('limit-users')
    .select(user.id, user.name)
    .from(user)
    .order(user.name)
    .limit(10)
    .offset(10);
Harness.test({
    query: instance.select(limitUsers.name, post.tags).from(limitUsers.leftJoin(post).on(post.userId.equals(limitUsers.id))),
    pg: {
        text:
            'SELECT "limit-users"."name", "post"."tags" FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" LIMIT $1 OFFSET $2) "limit-users" LEFT JOIN "post" ON ("post"."userId" = "limit-users"."id")',
        string:
            'SELECT "limit-users"."name", "post"."tags" FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" LIMIT 10 OFFSET 10) "limit-users" LEFT JOIN "post" ON ("post"."userId" = "limit-users"."id")'
    },
    sqlite: {
        text:
            'SELECT "limit-users"."name", "post"."tags" FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" LIMIT $1 OFFSET $2) "limit-users" LEFT JOIN "post" ON ("post"."userId" = "limit-users"."id")',
        string:
            'SELECT "limit-users"."name", "post"."tags" FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" LIMIT 10 OFFSET 10) "limit-users" LEFT JOIN "post" ON ("post"."userId" = "limit-users"."id")'
    },
    mysql: {
        text:
            'SELECT `limit-users`.`name`, `post`.`tags` FROM (SELECT `user`.`id`, `user`.`name` FROM `user` ORDER BY `user`.`name` LIMIT ? OFFSET ?) `limit-users` LEFT JOIN `post` ON (`post`.`userId` = `limit-users`.`id`)',
        string:
            'SELECT `limit-users`.`name`, `post`.`tags` FROM (SELECT `user`.`id`, `user`.`name` FROM `user` ORDER BY `user`.`name` LIMIT 10 OFFSET 10) `limit-users` LEFT JOIN `post` ON (`post`.`userId` = `limit-users`.`id`)'
    },
    mssql: {
        text:
            'SELECT [limit-users].[name], [post].[tags] FROM (SELECT [user].[id], [user].[name] FROM [user] ORDER BY [user].[name] OFFSET @1 ROWS FETCH NEXT @2 ROWS ONLY) [limit-users] LEFT JOIN [post] ON ([post].[userId] = [limit-users].[id])',
        string:
            'SELECT [limit-users].[name], [post].[tags] FROM (SELECT [user].[id], [user].[name] FROM [user] ORDER BY [user].[name] OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY) [limit-users] LEFT JOIN [post] ON ([post].[userId] = [limit-users].[id])'
    },
    oracle: {
        text:
            'SELECT "limit-users"."name", "post"."tags" FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" OFFSET :2 ROWS FETCH NEXT :1 ROWS ONLY) "limit-users" LEFT JOIN "post" ON ("post"."userId" = "limit-users"."id")',
        string:
            'SELECT "limit-users"."name", "post"."tags" FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY) "limit-users" LEFT JOIN "post" ON ("post"."userId" = "limit-users"."id")'
    },
    params: [10, 10]
});

Harness.test({
    query: instance.select(limitUsers.star()).from(limitUsers.join(post).on(post.userId.equals(limitUsers.id))),
    pg: {
        text:
            'SELECT "limit-users".* FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" LIMIT $1 OFFSET $2) "limit-users" INNER JOIN "post" ON ("post"."userId" = "limit-users"."id")',
        string:
            'SELECT "limit-users".* FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" LIMIT 10 OFFSET 10) "limit-users" INNER JOIN "post" ON ("post"."userId" = "limit-users"."id")'
    },
    sqlite: {
        text:
            'SELECT "limit-users".* FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" LIMIT $1 OFFSET $2) "limit-users" INNER JOIN "post" ON ("post"."userId" = "limit-users"."id")',
        string:
            'SELECT "limit-users".* FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" LIMIT 10 OFFSET 10) "limit-users" INNER JOIN "post" ON ("post"."userId" = "limit-users"."id")'
    },
    mysql: {
        text:
            'SELECT `limit-users`.* FROM (SELECT `user`.`id`, `user`.`name` FROM `user` ORDER BY `user`.`name` LIMIT ? OFFSET ?) `limit-users` INNER JOIN `post` ON (`post`.`userId` = `limit-users`.`id`)',
        string:
            'SELECT `limit-users`.* FROM (SELECT `user`.`id`, `user`.`name` FROM `user` ORDER BY `user`.`name` LIMIT 10 OFFSET 10) `limit-users` INNER JOIN `post` ON (`post`.`userId` = `limit-users`.`id`)'
    },
    mssql: {
        text:
            'SELECT [limit-users].* FROM (SELECT [user].[id], [user].[name] FROM [user] ORDER BY [user].[name] OFFSET @1 ROWS FETCH NEXT @2 ROWS ONLY) [limit-users] INNER JOIN [post] ON ([post].[userId] = [limit-users].[id])',
        string:
            'SELECT [limit-users].* FROM (SELECT [user].[id], [user].[name] FROM [user] ORDER BY [user].[name] OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY) [limit-users] INNER JOIN [post] ON ([post].[userId] = [limit-users].[id])'
    },
    oracle: {
        text:
            'SELECT "limit-users".* FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" OFFSET :2 ROWS FETCH NEXT :1 ROWS ONLY) "limit-users" INNER JOIN "post" ON ("post"."userId" = "limit-users"."id")',
        string:
            'SELECT "limit-users".* FROM (SELECT "user"."id", "user"."name" FROM "user" ORDER BY "user"."name" OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY) "limit-users" INNER JOIN "post" ON ("post"."userId" = "limit-users"."id")'
    },
    params: [10, 10]
});

const groupedCustomersByName = customerAlias
    .subQuery<{ name_alias: string, countForName: number }>('grouped-customers')
    .select(customerAlias.name_alias, customerAlias.count().as('countForName'))
    .from(customerAlias)
    .group(customerAlias.name_alias)
    .order(customerAlias.name_alias);
Harness.test({
    query: instance.select(groupedCustomersByName.name_alias, groupedCustomersByName.countForName).from(groupedCustomersByName),
    pg: {
        text:
            'SELECT "grouped-customers"."name_alias", "grouped-customers"."countForName" FROM (SELECT "customer"."name" AS "name_alias", COUNT("customer".*) AS "countForName" FROM "customer" GROUP BY "customer"."name" ORDER BY "customer"."name") "grouped-customers"',
        string:
            'SELECT "grouped-customers"."name_alias", "grouped-customers"."countForName" FROM (SELECT "customer"."name" AS "name_alias", COUNT("customer".*) AS "countForName" FROM "customer" GROUP BY "customer"."name" ORDER BY "customer"."name") "grouped-customers"'
    },
    sqlite: {
        text:
            'SELECT "grouped-customers"."name_alias", "grouped-customers"."countForName" FROM (SELECT "customer"."name" AS "name_alias", COUNT("customer".*) AS "countForName" FROM "customer" GROUP BY "customer"."name" ORDER BY "customer"."name") "grouped-customers"',
        string:
            'SELECT "grouped-customers"."name_alias", "grouped-customers"."countForName" FROM (SELECT "customer"."name" AS "name_alias", COUNT("customer".*) AS "countForName" FROM "customer" GROUP BY "customer"."name" ORDER BY "customer"."name") "grouped-customers"'
    },
    mysql: {
        text:
            'SELECT `grouped-customers`.`name_alias`, `grouped-customers`.`countForName` FROM (SELECT `customer`.`name` AS `name_alias`, COUNT(*) AS `countForName` FROM `customer` GROUP BY `customer`.`name` ORDER BY `customer`.`name`) `grouped-customers`',
        string:
            'SELECT `grouped-customers`.`name_alias`, `grouped-customers`.`countForName` FROM (SELECT `customer`.`name` AS `name_alias`, COUNT(*) AS `countForName` FROM `customer` GROUP BY `customer`.`name` ORDER BY `customer`.`name`) `grouped-customers`'
    },
    mssql: {
        text:
            'SELECT [grouped-customers].[name_alias], [grouped-customers].[countForName] FROM (SELECT [customer].[name] AS [name_alias], COUNT(*) AS [countForName] FROM [customer] GROUP BY [customer].[name] ORDER BY [customer].[name]) [grouped-customers]',
        string:
            'SELECT [grouped-customers].[name_alias], [grouped-customers].[countForName] FROM (SELECT [customer].[name] AS [name_alias], COUNT(*) AS [countForName] FROM [customer] GROUP BY [customer].[name] ORDER BY [customer].[name]) [grouped-customers]'
    },
    oracle: {
        text:
            'SELECT "grouped-customers"."name_alias", "grouped-customers"."countForName" FROM (SELECT "customer"."name" "name_alias", COUNT(*) "countForName" FROM "customer" GROUP BY "customer"."name" ORDER BY "customer"."name") "grouped-customers"',
        string:
            'SELECT "grouped-customers"."name_alias", "grouped-customers"."countForName" FROM (SELECT "customer"."name" "name_alias", COUNT(*) "countForName" FROM "customer" GROUP BY "customer"."name" ORDER BY "customer"."name") "grouped-customers"'
    },
    params: []
});
