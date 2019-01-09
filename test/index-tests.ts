'use strict';
import { throws, equal, deepEqual } from 'assert';

import { Sql } from '../lib';

const instance = new Sql();
const user = instance.define<{ id: string; email: string }>({
    name: 'user',
    columns: ['id', 'email']
});

suite('index', function() {
    test('unknown dialect throws exception', function() {
        throws(function() {
            // for testing purposes ignore the compile-time error
            //@ts-ignore
            instance.setDialect('asdf');
        });
    });

    test("stores the default dialect's name if none has been passed", function() {
        equal(new Sql().dialectName, 'postgres');
    });

    test('stores the sqlite dialect', function() {
        equal(new Sql('sqlite').dialectName, 'sqlite');
    });

    test('stores the mysql dialect', function() {
        equal(new Sql('mysql').dialectName, 'mysql');
    });

    test('stores the mssql dialect', function() {
        equal(new Sql('mssql').dialectName, 'mssql');
    });

    test('stores the oracle dialect', function() {
        equal(new Sql('oracle').dialectName, 'oracle');
    });

    test('can create a query using the default dialect', function() {
        const query = instance
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toQuery();
        equal(query.text, 'SELECT "user"."id" FROM "user" WHERE ("user"."email" = $1)');
        equal(query.values[0], 'brian.m.carlson@gmail.com');
    });

    test('setting dialect to postgres works', function() {
        instance.setDialect('postgres');
        const query = instance
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toQuery();
        equal(query.text, 'SELECT "user"."id" FROM "user" WHERE ("user"."email" = $1)');
        equal(query.values[0], 'brian.m.carlson@gmail.com');
    });

    test('sql.create creates an instance with a new dialect', function() {
        const mysql = new Sql('mysql');
        const query = mysql
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toQuery();
        equal(query.text, 'SELECT `user`.`id` FROM `user` WHERE (`user`.`email` = ?)');
        equal(query.values[0], 'brian.m.carlson@gmail.com');
    });

    test('sql.define for parallel dialects work independently', function() {
        const mssql = new Sql('mssql');
        const mysql = new Sql('mysql');
        const postgres = new Sql('postgres');
        const sqlite = new Sql('sqlite');
        const oracle = new Sql('oracle');

        const mssqlTable = mssql.define({ name: 'table', columns: ['column'] });
        const mysqlTable = mysql.define({ name: 'table', columns: ['column'] });
        const postgresTable = postgres.define({ name: 'table', columns: ['column'] });
        const sqliteTable = sqlite.define({ name: 'table', columns: ['column'] });
        const oracleTable = oracle.define({ name: 'table', columns: ['column'] });

        equal(mysqlTable.sql, mysql);
        equal(postgresTable.sql, postgres);
        equal(sqliteTable.sql, sqlite);
        equal(mssqlTable.sql, mssql);
        equal(oracleTable.sql, oracle);
    });

    test('using Sql as a class', function() {
        const mssql = new Sql('mssql');
        const mysql = new Sql('mysql');
        const postgres = new Sql('postgres');
        const sqlite = new Sql('sqlite');
        const oracle = new Sql('oracle');

        equal(mysql.dialect, require('../lib/dialect/mysql').Mysql);
        equal(postgres.dialect, require('../lib/dialect/postgres').Postgres);
        equal(sqlite.dialect, require('../lib/dialect/sqlite').Sqlite);
        equal(mssql.dialect, require('../lib/dialect/mssql').Mssql);
        equal(oracle.dialect, require('../lib/dialect/oracle').Oracle);
    });

    test('override dialect for toQuery using dialect name', function() {
        const mssql = new Sql('mssql');
        const mysql = new Sql('mysql');
        const postgres = new Sql('postgres');
        const sqlite = new Sql('sqlite');
        const oracle = new Sql('oracle');

        const sqliteQuery = mysql
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toQuery('sqlite');
        const postgresQuery = sqlite
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toQuery('postgres');
        const mysqlQuery = postgres
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toQuery('mysql');
        const mssqlQuery = mssql
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toQuery('mssql');
        const oracleQuery = oracle
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toQuery('oracle');

        const values = ['brian.m.carlson@gmail.com'];
        equal(sqliteQuery.text, 'SELECT "user"."id" FROM "user" WHERE ("user"."email" = $1)');
        deepEqual(sqliteQuery.values, values);

        equal(postgresQuery.text, 'SELECT "user"."id" FROM "user" WHERE ("user"."email" = $1)');
        deepEqual(postgresQuery.values, values);

        equal(mysqlQuery.text, 'SELECT `user`.`id` FROM `user` WHERE (`user`.`email` = ?)');
        deepEqual(mysqlQuery.values, values);

        equal(mssqlQuery.text, 'SELECT [user].[id] FROM [user] WHERE ([user].[email] = @1)');
        deepEqual(mssqlQuery.values, values);

        equal(oracleQuery.text, 'SELECT "user"."id" FROM "user" WHERE ("user"."email" = :1)');
        deepEqual(oracleQuery.values, values);
    });

    test('override dialect for toQuery using invalid dialect name', function() {
        const query = instance.select(user.id).from(user);
        throws(function() {
            query.toQuery('invalid');
        });
    });

    test('using named queries with toNamedQuery', function() {
        const query = instance
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toNamedQuery('users');
        equal(query.text, 'SELECT "user"."id" FROM "user" WHERE ("user"."email" = $1)');
        equal(query.values[0], 'brian.m.carlson@gmail.com');
        equal(query.name, 'users');
    });

    test('provide an empty query name for toNamedQuery', function() {
        const query = instance.select(user.id).from(user);
        throws(function() {
            query.toNamedQuery('');
        });
    });

    test('provide an undefined query name for toNamedQuery', function() {
        const query = instance.select(user.id).from(user);
        throws(function() {
            // for testing purposes ignore the compile-time error
            //@ts-ignore
            query.toNamedQuery();
        });
    });

    test('override dialect for toNamedQuery using dialect name', function() {
        const mysql = new Sql('mysql');
        const postgres = new Sql('postgres');
        const sqlite = new Sql('sqlite');
        const mssql = new Sql('mssql');
        const oracle = new Sql('oracle');

        const sqliteQuery = mysql
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toNamedQuery('user.select_brian', 'sqlite');
        const postgresQuery = sqlite
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toNamedQuery('user.select_brian', 'postgres');
        const mysqlQuery = postgres
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toNamedQuery('user.select_brian', 'mysql');
        const oracleQuery = mssql
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toNamedQuery('user.select_brian', 'oracle');
        const mssqlQuery = oracle
            .select(user.id)
            .from(user)
            .where(user.email.equals('brian.m.carlson@gmail.com'))
            .toNamedQuery('user.select_brian', 'mssql');

        const values = ['brian.m.carlson@gmail.com'];
        equal(sqliteQuery.text, 'SELECT "user"."id" FROM "user" WHERE ("user"."email" = $1)');
        deepEqual(sqliteQuery.values, values);
        equal('user.select_brian', sqliteQuery.name);

        equal(postgresQuery.text, 'SELECT "user"."id" FROM "user" WHERE ("user"."email" = $1)');
        deepEqual(postgresQuery.values, values);
        equal('user.select_brian', postgresQuery.name);

        equal(mysqlQuery.text, 'SELECT `user`.`id` FROM `user` WHERE (`user`.`email` = ?)');
        deepEqual(mysqlQuery.values, values);
        equal('user.select_brian', mysqlQuery.name);

        equal(mssqlQuery.text, 'SELECT [user].[id] FROM [user] WHERE ([user].[email] = @1)');
        deepEqual(mssqlQuery.values, values);
        equal('user.select_brian', mssqlQuery.name);

        equal(oracleQuery.text, 'SELECT "user"."id" FROM "user" WHERE ("user"."email" = :1)');
        deepEqual(oracleQuery.values, values);
        equal('user.select_brian', oracleQuery.name);
    });

    test('override dialect for toNamedQuery using invalid dialect name', function() {
        const query = instance.select(user.id).from(user);
        throws(function() {
            query.toNamedQuery('name', 'invalid');
        });
    });

    test('mssql default parameter place holder is @index', function() {
        const mssql = new Sql('mssql');
        const query = mssql
            .select(user.id)
            .from(user)
            .where(user.email.equals('x@y.com'))
            .toQuery();
        equal(query.text, 'SELECT [user].[id] FROM [user] WHERE ([user].[email] = @1)');
        equal(query.values[0], 'x@y.com');
    });

    test('mssql override default parameter placeholder with ?', function() {
        const mssql = new Sql('mssql', { questionMarkParameterPlaceholder: true });
        const query = mssql
            .select(user.id)
            .from(user)
            .where(user.email.equals('x@y.com'))
            .toQuery();
        equal(query.text, 'SELECT [user].[id] FROM [user] WHERE ([user].[email] = ?)');
        equal(query.values[0], 'x@y.com');
    });
});
