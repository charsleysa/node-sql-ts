# node-sql-ts

_sql string builder for node_ - supports PostgreSQL, mysql, Microsoft SQL Server, Oracle and sqlite dialects.

Building SQL statements by hand is no fun, especially in a language which has clumsy support for multi-line strings.

So let's build it with TypeScript (JavaScript also supported).

Maybe it's still not fun, but at least it's _less not fun_.

![CI/CD](https://github.com/charsleysa/node-sql-ts/workflows/CI/CD/badge.svg)

## install

```sh
$ npm install sql-ts
```

## use

```ts
//require the module
import { Sql } from 'sql-ts';

//(optionally) set the SQL dialect
const sql = new Sql('postgres');
//possible dialects: mssql, mysql, postgres (default), sqlite

//first we define our tables
const user = sql.define<{ id: number; name: string; email: string; lastLogin: Date }>({
    name: 'user',
    columns: ['id', 'name', 'email', 'lastLogin']
});

const post = sql.define<{ id: number; userId: number; date: Date; title: string; body: string }>({
    name: 'post',
    columns: ['id', 'userId', 'date', 'title', 'body']
});

//now let's make a simple query
const query = user
    .select(user.star())
    .from(user)
    .toQuery();
console.log(query.text); //SELECT "user".* FROM "user"

//something more interesting
const query = user
    .select(user.id)
    .from(user)
    .where(user.name.equals('boom').and(user.id.equals(1)))
    .or(user.name.equals('bang').and(user.id.equals(2)))
    .toQuery();

//query is parameterized by default
console.log(query.text); //SELECT "user"."id" FROM "user" WHERE ((("user"."name" = $1) AND ("user"."id" = $2)) OR (("user"."name" = $3) AND ("user"."id" = $4)))

console.log(query.values); //['boom', 1, 'bang', 2]

//queries can be named
const query = user
    .select(user.star())
    .from(user)
    .toNamedQuery('user.all');
console.log(query.name); //'user.all'

//how about a join?
const query = user
    .select(user.name, post.body)
    .from(user.join(post).on(user.id.equals(post.userId)))
    .toQuery();

console.log(query.text); //'SELECT "user"."name", "post"."body" FROM "user" INNER JOIN "post" ON ("user"."id" = "post"."userId")'

//this also makes parts of your queries composable, which is handy

const friendship = sql.define<{ userId: number; friendId: number }>({
    name: 'friendship',
    columns: ['userId', 'friendId']
});

const friends = user.as('friends');
const userToFriends = user
    .leftJoin(friendship)
    .on(user.id.equals(friendship.userId))
    .leftJoin(friends)
    .on(friendship.friendId.equals(friends.id));

//and now...compose...
const friendsWhoHaveLoggedInQuery = user.from(userToFriends).where(friends.lastLogin.isNotNull());
//SELECT * FROM "user"
//LEFT JOIN "friendship" ON ("user"."id" = "friendship"."userId")
//LEFT JOIN "user" AS "friends" ON ("friendship"."friendId" = "friends"."id")
//WHERE "friends"."lastLogin" IS NOT NULL

const friendsWhoUseGmailQuery = user.from(userToFriends).where(friends.email.like('%@gmail.com'));
//SELECT * FROM "user"
//LEFT JOIN "friendship" ON ("user"."id" = "friendship"."userId")
//LEFT JOIN "user" AS "friends" ON ("friendship"."friendId" = "friends"."id")
//WHERE "friends"."email" LIKE %1

//Using different property names for columns
//helpful if your column name is long or not camelCase
const user = sql.define<{ id: number; state: string }>({
    name: 'user',
    columns: [
        {
            name: 'id'
        },
        {
            name: 'state_or_province',
            property: 'state'
        }
    ]
});

//now, instead of user.state_or_province, you can just use user.state
console.log(
    user
        .select()
        .where(user.state.equals('WA'))
        .toQuery().text
);
// "SELECT "user".* FROM "user" WHERE ("user"."state_or_province" = $1)"
```

There are a **lot** more examples included in the [test/dialects](https://github.com/charsleysa/node-sql-ts/tree/master/test/dialects) folder. We encourage you to read through them if you have any questions on usage!

## contributing

We **love** contributions.

node-sql wouldn't be anything without all the contributors and collaborators who've worked on it.
If you'd like to become a collaborator here's how it's done:

1. fork the repo
2. `git pull https://github.com/(your_username)/node-sql-ts`
3. `cd node-sql-ts`
4. `npm install`
5. `npm test`

At this point the tests should pass for you. If they don't pass please open an issue with the output or you can even send me an email directly.
My email address is on my github profile and also on every commit I contributed in the repo.

Once the tests are passing, modify as you see fit. _Please_ make sure you write tests to cover your modifications. Once you're ready, commit your changes and submit a pull request.

**As long as your pull request doesn't have completely off-the-wall changes and it does have tests we will almost always merge it and push it to npm**

If you think your changes are too off-the-wall, open an issue or a pull-request without code so we can discuss them before you begin.

Usually after a few high-quality pull requests and friendly interactions we will gladly share collaboration rights with you.

After all, open source belongs to everyone.

## license

MIT
