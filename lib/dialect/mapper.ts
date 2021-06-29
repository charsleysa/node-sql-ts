import type { Dialect } from './dialect.js';

const dialects = new Map<string, new (...args: any[]) => Dialect<any>>();

export const registerDialect = (dialect: string, ctor: new (...args: any[]) => Dialect<any>) => {
    dialects.set(dialect, ctor);
}

// given a dialect name, return the class
export const getDialect = (dialect: string): new (...args: any[]) => Dialect<any> => {
    const foundDialect = dialects.get(dialect.toLowerCase());
    if (foundDialect == null) {
        throw new Error(dialect + ' is unsupported');
    } else {
        return foundDialect;
    }
};

// default dialect is postgres
export const DEFAULT_DIALECT = 'postgres';