import { Table } from '../table.js';
import { Node } from './node.js';

export class TableNode extends Node {
    public table: Table<unknown>;
    constructor(table: Table<unknown>) {
        super('TABLE');
        this.table = table;
    }
}
