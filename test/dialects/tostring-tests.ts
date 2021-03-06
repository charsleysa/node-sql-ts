import assert from 'assert';
import * as Harness from './support.js';
const post = Harness.definePostTable();

// Null
Harness.test({
    query: post.content.equals(null),
    pg: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = NULL)'
    },
    sqlite: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = NULL)'
    },
    mysql: {
        text: '(`post`.`content` = ?)',
        string: '(`post`.`content` = NULL)'
    },
    mssql: {
        text: '([post].[content] = @1)',
        string: '([post].[content] = NULL)'
    },
    oracle: {
        text: '("post"."content" = :1)',
        string: '("post"."content" = NULL)'
    },
    params: [null]
});

// Number
Harness.test({
    query: post.content.equals(3.14),
    pg: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = 3.14)'
    },
    sqlite: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = 3.14)'
    },
    mysql: {
        text: '(`post`.`content` = ?)',
        string: '(`post`.`content` = 3.14)'
    },
    mssql: {
        text: '([post].[content] = @1)',
        string: '([post].[content] = 3.14)'
    },
    oracle: {
        text: '("post"."content" = :1)',
        string: '("post"."content" = 3.14)'
    },
    params: [3.14]
});

// String
Harness.test({
    query: post.content.equals("hello'"),
    pg: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = \'hello\'\'\')'
    },
    sqlite: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = \'hello\'\'\')'
    },
    mysql: {
        text: '(`post`.`content` = ?)',
        string: "(`post`.`content` = 'hello''')"
    },
    mssql: {
        text: '([post].[content] = @1)',
        string: "([post].[content] = 'hello''')"
    },
    oracle: {
        text: '("post"."content" = :1)',
        string: '("post"."content" = \'hello\'\'\')'
    },
    params: ["hello'"]
});

// Array
Harness.test({
    query: post.content.equals([1, '2', null]),
    pg: {
        text: '("post"."content" = ($1, $2, $3))',
        string: '("post"."content" = (1, \'2\', NULL))'
    },
    sqlite: {
        text: '("post"."content" = ($1, $2, $3))',
        string: '("post"."content" = (1, \'2\', NULL))'
    },
    mysql: {
        text: '(`post`.`content` = (?, ?, ?))',
        string: "(`post`.`content` = (1, '2', NULL))"
    },
    mssql: {
        text: 'SQL Server does not support arrays.',
        throws: true
    },
    oracle: {
        text: 'SQL Server does not support arrays.',
        throws: true
    },
    params: [1, '2', null]
});

// Date
Harness.test({
    query: post.content.equals(new Date('Sat, 01 Jan 2000 00:00:00 GMT')),
    pg: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = \'2000-01-01T00:00:00.000Z\')'
    },
    sqlite: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = \'2000-01-01T00:00:00.000Z\')'
    },
    mysql: {
        text: '(`post`.`content` = ?)',
        string: "(`post`.`content` = '2000-01-01T00:00:00.000Z')"
    },
    mssql: {
        text: '([post].[content] = @1)',
        string: "([post].[content] = '2000-01-01T00:00:00.000Z')"
    },
    oracle: {
        text: '("post"."content" = :1)',
        string: '("post"."content" = \'2000-01-01T00:00:00.000Z\')'
    },
    params: [new Date('Sat, 01 Jan 2000 00:00:00 GMT')]
});

// Date to milliseconds
Harness.test({
    query: post.content.equals(new Date('Sat, 01 Jan 2000 00:00:00 GMT')),
    pg: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = \'2000-01-01T00:00:00.000Z\')'
    },
    sqlite: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = 946684800000)',
        config: {
            dateTimeMillis: true
        }
    },
    mysql: {
        text: '(`post`.`content` = ?)',
        string: "(`post`.`content` = '2000-01-01T00:00:00.000Z')"
    },
    mssql: {
        text: '([post].[content] = @1)',
        string: "([post].[content] = '2000-01-01T00:00:00.000Z')"
    },
    oracle: {
        text: '("post"."content" = :1)',
        string: '("post"."content" = \'2000-01-01T00:00:00.000Z\')'
    },
    params: [new Date('Sat, 01 Jan 2000 00:00:00 GMT')]
});

// Date Year 0 and before
Harness.test({
    query: post.content.equals(new Date('0000-01-01T00:00:00.000Z')),
    pg: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = \'0001-01-01T00:00:00.000Z BC\')'
    },
    sqlite: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = \'0000-01-01T00:00:00.000Z\')'
    },
    mysql: {
        text: '(`post`.`content` = ?)',
        string: "(`post`.`content` = '0000-01-01T00:00:00.000Z')"
    },
    mssql: {
        text: '([post].[content] = @1)',
        string: "([post].[content] = '0000-01-01T00:00:00.000Z')"
    },
    oracle: {
        text: '("post"."content" = :1)',
        string: '("post"."content" = \'0000-01-01T00:00:00.000Z\')'
    },
    params: [new Date('0000-01-01T00:00:00.000Z')]
});

// Object
const customObject = {
    toString() {
        return 'secretMessage';
    }
};

Harness.test({
    query: post.content.equals(customObject),
    pg: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = \'secretMessage\')'
    },
    sqlite: {
        text: '("post"."content" = $1)',
        string: '("post"."content" = \'secretMessage\')'
    },
    mysql: {
        text: '(`post`.`content` = ?)',
        string: "(`post`.`content` = 'secretMessage')"
    },
    mssql: {
        text: '([post].[content] = @1)',
        string: "([post].[content] = 'secretMessage')"
    },
    oracle: {
        text: '("post"."content" = :1)',
        string: '("post"."content" = \'secretMessage\')'
    },
    params: [customObject]
});

// Undefined
assert.throws(function() {
    post.content.equals(undefined).toString();
});
