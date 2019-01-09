'use strict';

import { Node } from '.';
import { Table } from '../table';

export class TableNode extends Node {
    public table: Table<any>;
    constructor(table: Table<any>) {
        super('TABLE');
        this.table = table;
    }
}
