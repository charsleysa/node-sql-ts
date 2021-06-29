/* eslint-disable max-classes-per-file */
import assert from 'assert';
import { DEFAULT_DIALECT, getDialect } from '../dialect/mapper.js';
import type { Dialect } from '../dialect/dialect.js';
import { INodeable, instanceofINodeable } from '../nodeable.js';
import type { Sql } from '../sql.js';
import type { Query } from './query.js';

export abstract class Node implements INodeable {
    public sql?: Sql;
    public readonly type: string;
    public nodes: Node[];
    constructor(type: string) {
        this.type = type;
        this.nodes = [];
    }
    public toNode() {
        return this;
    }
    public add(node: Node | INodeable) {
        assert(node, 'Error while trying to add a non-existent node to a query');
        if (!instanceofINodeable(node)) {
            throw new Error('Expected Node or INodeable, got ' + typeof node);
        }
        this.nodes.push(node.toNode());
        return this;
    }
    public unshift(node: Node | INodeable) {
        assert(node, 'Error while trying to add a non-existent node to a query');
        if (!instanceofINodeable(node)) {
            throw new Error('Expected Node or INodeable, got ' + typeof node);
        }
        this.nodes.unshift(node.toNode());
        return this;
    }
    public toQuery(dialect?: string) {
        const DialectClass = determineDialect(this, dialect);
        return initializeDialect(DialectClass, this).getQuery(this as unknown as Query<unknown>);
    }
    public toNamedQuery(name: string, dialect?: string) {
        if (!name || typeof name !== 'string' || name === '') {
            throw new Error('A query name has to be a non-empty String.');
        }
        const query = this.toQuery(dialect);
        return { ...query, name };
    }
    public toString(dialect?: string) {
        const DialectClass = determineDialect(this, dialect);
        return initializeDialect(DialectClass, this).getString(this as unknown as Query<unknown>);
    }
    public addAll(nodes: (Node | INodeable)[]) {
        for (let i = 0, len = nodes.length; i < len; i++) {
            this.add(nodes[i]);
        }
        return this;
    }
}

// Before the change that introduced parallel dialects, every node could be turned
// into a query. The parallel dialects change made it impossible to change some nodes
// into a query because not all nodes are constructed with the sql instance.
const determineDialect = (query: any, dialect?: string): new (...args: any[]) => Dialect<any> => {
    const sql = query.sql || (query.table && query.table.sql);
    let DialectClass;

    if (dialect) {
        // dialect is specified
        DialectClass = getDialect(dialect);
    } else if (sql && sql.dialect) {
        // dialect is not specified, use the dialect from the sql instance
        DialectClass = sql.dialect;
    } else {
        // dialect is not specified, use the default dialect
        DialectClass = getDialect(DEFAULT_DIALECT);
    }
    return DialectClass;
};

const initializeDialect = <T extends new (...args: any[]) => Dialect<any>>(DialectClass: T, query: any): Dialect<any> => {
    const sql = query.sql || (query.table && query.table.sql);
    const config = sql ? sql.config : {};
    return new DialectClass(config);
};
