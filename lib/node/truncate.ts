'use strict';

import { Node } from '.';
import { Table } from '../table';

export class TruncateNode extends Node {
    constructor(table: Table<unknown>) {
        super('TRUNCATE');
        this.add(table);
    }
}
