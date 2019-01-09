'use strict';

import { Node } from '.';
import { Table } from '../table';

export class DropNode extends Node {
    constructor(table: Table<any>) {
        super('DROP');
        this.add(table);
    }
}
