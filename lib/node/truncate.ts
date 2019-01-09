'use strict';

import { Node } from '.';
import { Table } from '../table';

export class TruncateNode extends Node {
    constructor(table: Table<any>) {
        super('TRUNCATE');
        this.add(table);
    }
}
