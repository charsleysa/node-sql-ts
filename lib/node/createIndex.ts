'use strict';

import sliced from 'sliced';
import { Node } from '.';
import { Column } from '../column';
import { Table } from '../table';

export class CreateIndexNode extends Node {
    public table: Table<unknown>;
    public options: {
        indexName: string;
        columns: Column<unknown>[];
        type?: string;
        algorithm?: string;
        parser?: string;
    };

    constructor(table: Table<unknown>, indexName: string) {
        super('CREATE INDEX');

        this.table = table;
        this.options = { indexName, columns: [] };
    }

    public unique() {
        this.options.type = 'unique';
        return this;
    }

    public spatial() {
        this.options.type = 'spatial';
        return this;
    }

    public fulltext() {
        this.options.type = 'fulltext';
        return this;
    }

    public using(algorithm: string) {
        this.options.algorithm = algorithm;
        return this;
    }

    public on(...columns: Column<unknown>[]) {
        const args = sliced(columns);
        this.options.columns = this.options.columns.concat(args);
        return this;
    }

    public withParser(parser: string) {
        this.options.parser = parser;
        return this;
    }

    public indexName() {
        let result = this.options.indexName;

        if (!result) {
            const columns = this.options.columns.map((col) => (col.name ? col.name : col.value.name)).sort();

            result = [this.table.getName(), ...columns].join('_');
        }

        return result;
    }
}
