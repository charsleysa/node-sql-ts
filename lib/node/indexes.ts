'use strict';

import { Node } from '.';
import { Table } from '../table';

export class IndexesNode extends Node {
    public table: Table<any>;

    constructor(table: Table<any>) {
        super('INDEXES');

        this.table = table;
    }
}
