import { Column } from '../column.js';
import { Table } from '../table.js';
import { Node } from './node.js';

export class DropIndexNode extends Node {
    public table: Table<unknown>;
    public options: { indexName: string, ifExists?: boolean };

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

    public ifExists(): DropIndexNode {
        this.options.ifExists = true;
        return this
    }
}
