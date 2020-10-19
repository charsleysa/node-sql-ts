'use strict';

import map from 'lodash/map';
import fromPairs from 'lodash/fromPairs';
import { Column } from './column';
import { ColumnDefinition, TableDefinition } from './configTypes';
import { leftJoin } from './joiner';
import { ColumnNode, DropIndexNode, ForeignKeyNode, JoinNode, LiteralNode, Node, OrderByValueNode, Query, SubQuery, TableNode } from './node';
import { INodeable, PartialNodeable } from './nodeable';
import { Sql } from './sql';

export type TableWithColumns<T> = Table<T> & { [Name in NonNullable<keyof T>]: Column<T[Name]> };

export class Table<T> implements INodeable {
    get nodes(): Node[] {
        return this.select(this.star()).nodes;
    }
    public static define<Model>(config: TableDefinition): TableWithColumns<Model> {
        const table = new Table<Model>(config);
        // allow hash of columns as well as array
        if (config.columns && !Array.isArray(config.columns)) {
            const cols = [];

            for (const key in config.columns) {
                if (config.columns.hasOwnProperty(key)) {
                    const col = (config.columns as any)[key];
                    col.name = key;
                    cols.push(col);
                }
            }

            config.columns = cols;
        }
        for (const col of config.columns) {
            table.addColumn(col);
        }
        if (config.foreignKeys !== undefined) {
            if (Array.isArray(config.foreignKeys)) {
                for (const key of config.foreignKeys) {
                    table.foreignKeys.push(new ForeignKeyNode(key));
                }
            } else {
                table.foreignKeys.push(new ForeignKeyNode(config.foreignKeys));
            }
        }
        return table as TableWithColumns<Model>;
    }
    public columnWhiteList: boolean;
    public isTemporary: boolean;
    public snakeToCamel: boolean;
    public columns: Column<T[keyof T]>[];
    public foreignKeys: ForeignKeyNode[];
    public table: this;
    public sql!: Sql;
    public engine?: string;
    public charset?: string;
    public alias?: string;
    public initialConfig: TableDefinition;
    private schema?: string;
    private tableName: string;
    constructor(config: TableDefinition) {
        this.schema = config.schema;
        this.tableName = config.name;
        this.initialConfig = config;
        this.columnWhiteList = !!config.columnWhiteList;
        this.isTemporary = !!config.isTemporary;
        this.snakeToCamel = !!config.snakeToCamel;
        this.columns = [];
        this.foreignKeys = [];
        this.table = this;
        if (!config.sql) {
            config.sql = new Sql();
        }
        this.sql = config.sql;
        this.engine = config.engine;
        this.charset = config.charset;
    }
    public clone(config?: Partial<TableDefinition>): TableWithColumns<T> {
        return Table.define({
            columnWhiteList: !!this.columnWhiteList,
            columns: this.columns,
            foreignKeys: this.foreignKeys,
            name: this.tableName,
            schema: this.schema,
            snakeToCamel: !!this.snakeToCamel,
            sql: this.sql,
            ...(config || {})
        } as any);
    }
    public createColumn(col: string | ColumnDefinition | Column<unknown>): Column<unknown> {
        if (!(col instanceof Column)) {
            if (typeof col === 'string') {
                // tslint:disable-next-line:no-object-literal-type-assertion
                col = { name: col } as ColumnDefinition;
            }
            const column = new Column<unknown>({ ...col, table: this });
            // Load subfields from array into an object of form name: Column
            if (Array.isArray(col.subfields)) {
                column.subfields = fromPairs(map(col.subfields, (subfield) => {
                        return [
                            subfield,
                            new Column({
                                name: subfield,
                                subfieldContainer: column,
                                table: this
                            })
                        ];
                    }));
            }
            return column;
        }
        return col;
    }
    public addColumn(col: string | ColumnDefinition | Column<unknown>, options?: any) {
        const column = this.createColumn(col);
        options = { noisy: true, ...options };
        if (this.hasColumn(column)) {
            if (options.noisy) {
                throw new Error(`Table ${this.tableName} already has column or property by the name of ${column.name}`);
            } else {
                return this;
            }
        } else if (!!(this as any)[column.name] && process.env.NODE_ENV === 'debug') {
            // tslint:disable-next-line:no-console
            console.log(
                `Please notice that you have just defined the column "${
                    column.name
                }". In order to access it, you need to use "table.getColumn('${column.name}');"!`
            );
        }
        this.columns.push(column);
        const snakeToCamel = (snakeName: string) => {
            return snakeName.replace(/[\-_]([a-z])/g, (m, $1: string) => $1.toUpperCase());
        };
        const property = (column.property = column.property || (this.snakeToCamel ? snakeToCamel(column.name) : column.name));
        (this as any)[property] = (this as any)[property] || column;
        return this;
    }
    public hasColumn(col: Column<unknown> | string): boolean {
        const columnName = col instanceof Column ? col.name : col;
        return this.columns.some((column) => column.property === columnName || column.name === columnName);
    }
    public getColumn(colName: string) {
        for (const col of this.columns) {
            if (colName === col.property || colName === col.name) {
                return col;
            }
        }
        if (this.columnWhiteList) {
            return null;
        }
        throw new Error(`Table ${this.tableName} does not have a column or property named ${colName}`);
    }
    public get(colName: string) {
        return this.getColumn(colName);
    }
    public getSchema() {
        return this.schema;
    }
    public setSchema(schema: string) {
        this.schema = schema;
    }
    public getName() {
        if (this.sql && this.sql.dialectName === 'mssql' && this.isTemporary) {
            return `#${this.tableName}`;
        }
        return this.tableName;
    }
    public star(): Column<unknown>;
    public star(options: { prefix: string }): ColumnNode[];
    public star(options?: any): Column<unknown> | ColumnNode[] {
        options = options || {};
        if ('prefix' in options) {
            return this.columns.map((column) => column.as(options.prefix + column.name));
        }
        return new Column({ table: this, star: true });
    }
    public count(alias?: string): ColumnNode {
        const name = this.alias || this.tableName;
        const col: Column<unknown> = new Column({ table: this, star: true });
        // ColumnNode
        return col.count(alias || name + '_count');
    }
    public select(...args: any[]): Query<T> {
        // create the query and pass it off
        const query = new Query<T>(this);
        if (args.length === 0) {
            query.select(this.star());
        } else {
            query.select(...args);
        }
        return query;
    }
    public subQuery<C extends object>(alias?: string): SubQuery<T, C> {
        // create the query and pass it off
        const query = new Query<T>(this, true) as SubQuery<T, C>;
        query.columns = [];
        query.alias = alias;
        query.join = function(this: SubQuery<T, C>, other: INodeable) {
            return new JoinNode('INNER', this.toNode(), other.toNode());
        }
        return query;
    }
    public insert(object: Column<unknown>[] | Column<unknown>): Query<T>;
    public insert(object: PartialNodeable<T>[] | PartialNodeable<T>): Query<T>;
    public insert(...nodes: Column<unknown>[]): Query<T>;
    public insert(...nodes: (Column<unknown>[] | Column<unknown> | PartialNodeable<T>[] | PartialNodeable<T>)[]): Query<T> {
        const query = new Query<T>(this);
        if (!nodes[0] || (Array.isArray(nodes[0]) && (nodes[0] as Column<unknown>[] | PartialNodeable<T>[]).length === 0)) {
            query.select(this.star());
            query.where('1=2');
        } else {
            query.insert(...nodes as any);
        }
        return query;
    }
    public replace(object: Column<unknown>[] | Column<unknown>): Query<T>;
    public replace(object: PartialNodeable<T>[] | PartialNodeable<T>): Query<T>;
    public replace(...nodes: Column<unknown>[]): Query<T>;
    public replace(...nodes: (Column<unknown>[] | Column<unknown> | PartialNodeable<T>[] | PartialNodeable<T>)[]): Query<T> {
        const query = new Query<T>(this);
        if (!nodes[0] || (Array.isArray(nodes[0]) && (nodes[0] as Column<unknown>[] | PartialNodeable<T>[]).length === 0)) {
            query.select(this.star());
            query.where('1=2');
        } else {
            query.replace(...nodes as any);
        }
        return query;
    }
    public toNode(): TableNode {
        return new TableNode(this);
    }
    public join(other: INodeable): JoinNode {
        return new JoinNode('INNER', this.toNode(), other.toNode());
    }
    public leftJoin(other: INodeable): JoinNode {
        return new JoinNode('LEFT', this.toNode(), other.toNode());
    }
    // auto-join tables based on column intropsection
    public joinTo(other: Table<unknown>): JoinNode {
        return leftJoin(this, other);
    }
    public as(alias: string): TableWithColumns<T> {
        // TODO could this be cleaner?
        const t = Table.define<T>(this.initialConfig);
        t.alias = alias;
        return t;
    }
    public and(...args: Node[]): Query<T> {
        const query = new Query<T>(this);
        query.where(...args);
        return query;
    }
    public indexes(): IndexQuery {
        return new Query<T>(this).indexes() as IndexQuery;
    }
    public alter(): Query<T> {
        const query = new Query(this);
        query.alter();
        return query;
    }
    public create(): Query<T> {
        const query = new Query(this);
        query.create();
        return query;
    }
    public delete(table: Table<unknown>[] | Table<unknown> | Table<T> | Partial<T>): Query<T>;
    public delete(): Query<T>;
    public delete(arg?: Table<unknown>[] | Table<unknown> | Table<T> | Partial<T>): Query<T> {
        const query = new Query(this);
        query.delete(arg as any);
        return query;
    }
    public drop(): Query<T> {
        const query = new Query(this);
        query.drop();
        return query;
    }
    public from(table: Table<unknown>[] | Table<unknown> | Table<T> | JoinNode): Query<T>;
    public from(...tables: Table<unknown>[]): Query<T>;
    public from(...args: (Table<unknown>[] | Table<unknown> | Table<T> | JoinNode)[]): Query<T> {
        const query = new Query(this);
        query.from(...args as any);
        return query;
    }
    public limit(count: unknown): Query<T> {
        const query = new Query(this);
        query.limit(count);
        return query;
    }
    public offset(count: unknown): Query<T> {
        const query = new Query(this);
        query.offset(count);
        return query;
    }
    public or(object: Partial<T> | Node | string): Query<T> {
        const query = new Query(this);
        query.or(object);
        return query;
    }
    public order(node: INodeable[] | INodeable): Query<T>;
    public order(...nodes: INodeable[]): Query<T>;
    public order(...args: (INodeable[] | INodeable)[]): Query<T> {
        const query = new Query(this);
        query.order(...args as any);
        return query;
    }
    public truncate(): Query<T> {
        const query = new Query(this);
        query.truncate();
        return query;
    }
    public update(object: PartialNodeable<T>): Query<T> {
        const query = new Query(this);
        query.update(object);
        return query;
    }
    public where(object: Partial<T> | Node[] | Node | string): Query<T>;
    public where(...nodes: Node[]): Query<T>;
    public where(...args: (Partial<T> | Node[] | Node | string)[]): Query<T> {
        const query = new Query(this);
        query.where(...args as any);
        return query;
    }
}

interface IndexQuery {
    create(indexName?: string): IndexCreationQuery;
    drop(indexName: string): DropIndexNode;
    drop(...columns: Column<unknown>[]): DropIndexNode;
}

interface IndexCreationQuery extends Node {
    unique(): IndexCreationQuery;
    using(name: string): IndexCreationQuery;
    on(...columns: (Column<unknown> | OrderByValueNode)[]): IndexCreationQuery;
    withParser(parserName: string): IndexCreationQuery;
    fulltext(): IndexCreationQuery;
    spatial(): IndexCreationQuery;
}
