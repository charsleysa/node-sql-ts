import { Table } from './table';

export interface ITableTracker {
    table?: Table<unknown>;
}

export function hasTable(o: object): o is Required<ITableTracker> {
    return typeof o === 'object' && o !== null && 'table' in o;
}
