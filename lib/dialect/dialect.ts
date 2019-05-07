import { Query } from '../node';
import { Table } from '../table';

export abstract class Dialect {
    public config: any;
    constructor(config: any) {
        this.config = config;
    }
    public abstract getQuery(queryNode: Query<any> | Table<any>): { text: string, values: string[] };
    public abstract getString(queryNode: Query<any>): string;
}
