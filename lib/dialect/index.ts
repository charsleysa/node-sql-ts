'use strict';

import { Dialect } from './dialect';

// given a dialect name, return the class
export const getDialect = (dialect: string): Dialect => {
    switch (dialect.toLowerCase()) {
        case 'postgres':
            return require('./postgres').Postgres;
        case 'mysql':
            return require('./mysql').Mysql;
        case 'sqlite':
            return require('./sqlite').Sqlite;
        case 'mssql':
            return require('./mssql').Mssql;
        case 'oracle':
            return require('./oracle').Oracle;
        default:
            throw new Error(dialect + ' is unsupported');
    }
};

// default dialect is postgres
export const DEFAULT_DIALECT = 'postgres';
