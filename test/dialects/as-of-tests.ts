import * as Harness from './support.js';
import { Sql } from '../../dist/lib.js';
const post = Harness.definePostTable();
const user = Harness.defineUserTable();
const instance = new Sql('postgres');

Harness.test({
    query: user
        .select(user.star())
        .from(user)
        .asOf(instance.functions.FOLLOWER_READ_TIMESTAMP()),
    pg: {
        text: 'SELECT "user".* FROM "user" AS OF SYSTEM TIME FOLLOWER_READ_TIMESTAMP()',
        string: 'SELECT "user".* FROM "user" AS OF SYSTEM TIME FOLLOWER_READ_TIMESTAMP()'
    },
    oracle: {
        text: 'SELECT "user".* FROM "user" AS OF TIMESTAMP FOLLOWER_READ_TIMESTAMP()',
        string: 'SELECT "user".* FROM "user" AS OF TIMESTAMP FOLLOWER_READ_TIMESTAMP()'
    }
});

Harness.test({
    query: user.select(user.star()).from([user, post]).asOf('\'-10s\''),
    pg: {
        text: 'SELECT "user".* FROM "user" , "post" AS OF SYSTEM TIME \'-10s\'',
        string: 'SELECT "user".* FROM "user" , "post" AS OF SYSTEM TIME \'-10s\''
    },
    oracle: {
        text: 'SELECT "user".* FROM "user" , "post" AS OF TIMESTAMP \'-10s\'',
        string: 'SELECT "user".* FROM "user" , "post" AS OF TIMESTAMP \'-10s\''
    }
});
