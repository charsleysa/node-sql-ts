import { Table } from './table.js';

export interface ITableTracker {
    table?: Table<unknown>;
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function hasTable(o: unknown): o is Required<ITableTracker> {
    return typeof o === 'object' && o !== null && 'table' in o;
}
