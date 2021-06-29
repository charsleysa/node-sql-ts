import { Table } from '../table.js';
import { Node } from './node.js';

export class TruncateNode extends Node {
    constructor(table: Table<unknown>) {
        super('TRUNCATE');
        this.add(table);
    }
}
