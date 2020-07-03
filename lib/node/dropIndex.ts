'use strict';

import { Node } from '.';
import { Column } from '../column';
import { Table } from '../table';

export class DropIndexNode extends Node {
    public table: Table<unknown>;
    public options: { indexName: string };

    constructor(table: Table<unknown>, indexName: string | string[] | Column<unknown>[]) {
        super('DROP INDEX');

        if (!indexName) {
            throw new Error('No index defined!');
        } else if (Array.isArray(indexName) && typeof indexName[0] === 'string') {
            indexName = indexName[0] as string;
        } else if (Array.isArray(indexName)) {
            const columns = (indexName as Column<unknown>[]).map((col) => col.name).sort();
            indexName = [table.getName()].concat(columns).join('_');
        }

        this.table = table;
        this.options = { indexName };
    }
}
