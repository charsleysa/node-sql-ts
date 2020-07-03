import { Query } from '../node';
import { Table } from '../table';

export abstract class Dialect {
    public config: any;
    constructor(config: any) {
        this.config = config;
    }
    public abstract getQuery(queryNode: Query<unknown> | Table<unknown>): { text: string, values: string[] };
    public abstract getString(queryNode: Query<unknown>): string;
}
