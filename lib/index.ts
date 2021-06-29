export * from './node/node.js';
import './node/_internal.js';

export * from './node/select.js';
export * from './node/insert.js';
export * from './node/replace.js';
export * from './node/update.js';
export * from './node/delete.js';
export * from './node/create.js';
export * from './node/drop.js';
export * from './node/truncate.js';
export * from './node/distinct.js';
export * from './node/distinctOn.js';
export * from './node/alias.js';
export * from './node/alter.js';
export * from './node/cast.js';
export * from './node/from.js';
export * from './node/where.js';
export * from './node/orderBy.js';
export * from './node/orderByValue.js';
export * from './node/groupBy.js';
export * from './node/having.js';
export * from './node/prefixUnary.js';
export * from './node/postfixUnary.js';
export * from './node/binary.js';
export * from './node/ternary.js';
export * from './node/in.js';
export * from './node/notIn.js';
export * from './node/case.js';
export * from './node/at.js';
export * from './node/slice.js';
export * from './node/table.js';
export * from './node/column.js';
export * from './node/foreignKey.js';
export * from './node/functionCall.js';
export * from './node/arrayCall.js';
export * from './node/rowCall.js';
export * from './node/parameter.js';
export * from './node/default.js';
export * from './node/addColumn.js';
export * from './node/dropColumn.js';
export * from './node/renameColumn.js';
export * from './node/rename.js';
export * from './node/ifExists.js';
export * from './node/ifNotExists.js';
export * from './node/orIgnore.js';
export * from './node/cascade.js';
export * from './node/restrict.js';
export * from './node/forUpdate.js';
export * from './node/forShare.js';
export * from './node/join.js';
export * from './node/literal.js';
export * from './node/returning.js';
export * from './node/onDuplicate.js';
export * from './node/onConflict.js';
export * from './node/indexes.js';
export * from './node/createIndex.js';
export * from './node/dropIndex.js';
export * from './node/createView.js';
export * from './node/interval.js';
export * from './node/modifier.js';

export * from './node/query.js';

export * from './dialect/mapper.js';
export * from './sql.js';
export * from './column.js';
export * from './table.js';

import { Dialect } from './dialect/dialect.js';
import { Mssql } from './dialect/mssql.js';
import { Mysql } from './dialect/mysql.js';
import { Oracle } from './dialect/oracle.js';
import { Postgres } from './dialect/postgres.js';
import { Sqlite } from './dialect/sqlite.js';
import { registerDialect } from './dialect/mapper.js';

registerDialect('mssql', Mssql);
registerDialect('mysql', Mysql);
registerDialect('oracle', Oracle);
registerDialect('postgres', Postgres);
registerDialect('sqlite', Sqlite);

export {
    Dialect,
    Mssql,
    Mysql,
    Oracle,
    Postgres,
    Sqlite
}
