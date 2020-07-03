'use strict';

import { Node } from '.';
import { Table } from '../table';

export class TableNode extends Node {
    public table: Table<unknown>;
    constructor(table: Table<unknown>) {
        super('TABLE');
        this.table = table;
    }
}
