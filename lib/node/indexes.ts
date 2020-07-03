'use strict';

import { Node } from '.';
import { Table } from '../table';

export class IndexesNode extends Node {
    public table: Table<unknown>;

    constructor(table: Table<unknown>) {
        super('INDEXES');

        this.table = table;
    }
}
