'use strict';

import { Node } from '.';
import { Column } from '../column';
import { Table } from '../table';

export class DropIndexNode extends Node {
    public table: Table<any>;
    public options: { indexName: string };

    constructor(table: Table<any>, indexName: string | string[] | Array<Column<any>>) {
        super('DROP INDEX');

        if (!indexName) {
            throw new Error('No index defined!');
        } else if (Array.isArray(indexName) && typeof indexName[0] === 'string') {
            indexName = indexName[0] as string;
        } else if (Array.isArray(indexName)) {
            const columns = (indexName as Array<Column<any>>).map((col) => col.name).sort();
            indexName = [table.getName()].concat(columns).join('_');
        }

        this.table = table;
        this.options = { indexName };
    }
}
