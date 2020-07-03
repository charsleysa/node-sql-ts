'use strict';

import { Table } from './table';

const getPrimaryKeyColumn = (table: Table<unknown>) => {
    for (const col of table.columns) {
        if (col.primaryKey) {
            return col;
        }
    }
    return;
};

const findReference = (left: Table<unknown>, right: Table<unknown>) => {
    // find reference
    for (const col of right.columns) {
        const references = col.references;
        if (references) {
            const leftName = left.getName();
            if (typeof references === 'string') {
                if (references === leftName) {
                    const leftCol = getPrimaryKeyColumn(left);
                    return {
                        left: leftCol,
                        right: col
                    };
                }
            } else if (references.table === leftName) {
                const leftCol = references.column ? (left as any)[references.column] : getPrimaryKeyColumn(left);
                return {
                    left: leftCol,
                    right: col
                };
            }
        }
    }
    return;
};
// auto-join two tables based on column properties
// requires one column to have { references: {table: 'foreignTableName', column: 'foreignColumnName'}}
// or to have { references: 'foreignTableName'} -- in which case the foreign table's primary key is assumed
const leftJoin = (left: Table<unknown>, right: Table<unknown>) => {
    let ref = findReference(left, right);
    if (!ref) {
        ref = findReference(right, left);
    }
    return left.join(right).on(ref!.left.equals(ref!.right));
};

export { leftJoin };
