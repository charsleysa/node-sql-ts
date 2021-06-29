import { Node } from './node.js';
import { Table } from '../table.js';

export class IndexesNode extends Node {
    public table: Table<unknown>;

    constructor(table: Table<unknown>) {
        super('INDEXES');

        this.table = table;
    }
}
