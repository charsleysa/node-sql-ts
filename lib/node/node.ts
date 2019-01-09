'use strict';

import assert = require('assert');
import { TextNode } from '.';
import { Sql } from '..';
import { DEFAULT_DIALECT, getDialect } from '../dialect';
import { INodeable, instanceofINodeable } from '../nodeable';

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
    public add(node: Node | INodeable | string) {
        assert(node, 'Error while trying to add a non-existant node to a query');
        let newNode;
        if (typeof node === 'string') {
            newNode = new TextNode(node);
        } else if (instanceofINodeable(node)) {
            newNode = node.toNode();
        } else {
            newNode = node;
        }
        this.nodes.push(newNode as Node);
        return this;
    }
    public unshift(node: Node | INodeable | string) {
        assert(node, 'Error while trying to add a non-existant node to a query');
        this.nodes.unshift(typeof node === 'string' ? new TextNode(node) : node.toNode());
        return this;
    }
    public toQuery(dialect?: string) {
        const Dialect = determineDialect(this, dialect);
        return initializeDialect(Dialect, this).getQuery(this);
    }
    public toNamedQuery(name: string, dialect?: string) {
        if (!name || typeof name !== 'string' || name === '') {
            throw new Error('A query name has to be a non-empty String.');
        }
        const query = this.toQuery(dialect);
        query.name = name;
        return query;
    }
    public toString(dialect?: string) {
        const Dialect = determineDialect(this, dialect);
        return initializeDialect(Dialect, this).getString(this);
    }
    public addAll(nodes: Array<Node | INodeable | string>) {
        for (let i = 0, len = nodes.length; i < len; i++) {
            this.add(nodes[i]);
        }
        return this;
    }
}

// Before the change that introduced parallel dialects, every node could be turned
// into a query. The parallel dialects change made it impossible to change some nodes
// into a query because not all nodes are constructed with the sql instance.
const determineDialect = (query: any, dialect?: string) => {
    const sql = query.sql || (query.table && query.table.sql);
    let Dialect;

    if (dialect) {
        // dialect is specified
        Dialect = getDialect(dialect);
    } else if (sql && sql.dialect) {
        // dialect is not specified, use the dialect from the sql instance
        Dialect = sql.dialect;
    } else {
        // dialect is not specified, use the default dialect
        Dialect = getDialect(DEFAULT_DIALECT);
    }
    return Dialect;
};

const initializeDialect = (Dialect: any, query: any) => {
    const sql = query.sql || (query.table && query.table.sql);
    const config = sql ? sql.config : {};
    return new Dialect(config);
};
