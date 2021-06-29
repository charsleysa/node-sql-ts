import { Table } from '../table.js';
import { Node } from './node.js';

export class DropNode extends Node {
    constructor(table: Table<unknown>) {
        super('DROP');
        this.add(table);
    }
}
