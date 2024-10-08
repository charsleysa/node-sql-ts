/* eslint-disable no-underscore-dangle */
import assert from 'assert';
import sliced from 'sliced';

import { Column } from '../column.js';
import { INodeable, instanceofINodeable, PartialNodeable } from '../nodeable.js';
import { Table } from '../table.js';
import { AddColumnNode } from './addColumn.js';
import { AliasMixin } from './alias.js';
import { AlterNode } from './alter.js';
import { CascadeNode } from './cascade.js';
import { ColumnNode } from './column.js';
import { CreateNode } from './create.js';
import { CreateIndexNode } from './createIndex.js';
import { CreateViewNode } from './createView.js';
import { DeleteNode } from './delete.js';
import { DistinctNode } from './distinct.js';
import { DistinctOnNode } from './distinctOn.js';
import { DropNode } from './drop.js';
import { DropColumnNode } from './dropColumn.js';
import { DropIndexNode } from './dropIndex.js';
import { ForShareNode } from './forShare.js';
import { ForUpdateNode } from './forUpdate.js';
import { FromNode } from './from.js';
import { GroupByNode } from './groupBy.js';
import { HavingNode } from './having.js';
import { IfExistsNode } from './ifExists.js';
import { IfNotExistsNode } from './ifNotExists.js';
import { IndexesNode } from './indexes.js';
import { InsertNode } from './insert.js';
import { JoinNode } from './join.js';
import { ModifierNode } from './modifier.js';
import { Node } from './node.js';
import { OnConflictNode } from './onConflict.js';
import { OnDuplicateNode } from './onDuplicate.js';
import { OrderByNode } from './orderBy.js';
import { OrIgnoreNode } from './orIgnore.js';
import { ParameterNode } from './parameter.js';
import { PrefixUnaryNode } from './prefixUnary.js';
import { RenameNode } from './rename.js';
import { RenameColumnNode } from './renameColumn.js';
import { ReplaceNode } from './replace.js';
import { RestrictNode } from './restrict.js';
import { ReturningNode } from './returning.js';
import { SelectNode } from './select.js';
import { TableNode } from './table.js';
import { TextNode } from './text.js';
import { TruncateNode } from './truncate.js';
import { UpdateNode } from './update.js';
import { ValueExpressionBaseNode } from './_internal.js';
import { WhereNode } from './where.js';
import { AsOfNode } from './asOf.js';

// get the first element of an arguments if it is an array, else return arguments as an array
const getArrayOrArgsAsArray = <T>(args: (T | T[])[]): T[] => {
    const first = args[0];
    return Array.isArray(first) ? first : sliced(args as T[]);
};

const nodeableOrTextNode = (val: INodeable | string) => {
    return instanceofINodeable(val) ? val.toNode() : new TextNode(val);
}

// Here we are extending query from ValueExpressionBaseNode so that it's possible to write queries like
//   const query=sql.select(a.select(a.x.sum()).plus(b.select(b.y.sum()))
// which generates:
//   SELECT (SELECT SUM(a.x) FROM a) + (SELECT SUM(b.y) FROM b)
export class Query<T> extends ValueExpressionBaseNode {
    public table: Table<T>;
    public nodes: Node[] = [];
    public alias?: string;
    private whereClause?: WhereNode;
    private insertClause?: InsertNode;
    private replaceClause?: ReplaceNode;
    private indexesClause?: IndexesNode;
    private _select?: SelectNode;
    private _orderBy?: OrderByNode;
    private _distinctOn?: DistinctOnNode;

    constructor(table: Table<T>, isSubquery?: boolean) {
        super(isSubquery ? 'SUBQUERY' : 'QUERY');

        this.table = table;
        if (table) {
            this.sql = table.sql;
        }
    }

    // Extend the query with the aliasMixin so that it's possible to write queries like
    //   const query=sql.select(a.select(a.count()).as("column1"))
    // which generates:
    //   SELECT (SELECT COUNT(*) FROM a) AS "column1"
    public as = AliasMixin.as;

    public select(...args: any[]): this {
        let select;
        if (this._select) {
            select = this._select;
        } else {
            select = this._select = new SelectNode();
            this.add(select);
        }

        // allow things like .select(a.star(), [ a.id, a.name ])
        // this will flatten them into a single array
        const flattenedArgs = sliced(args).reduce((cur: any[], next: any) => {
            if (Array.isArray(next)) {
                return cur.concat(next);
            }

            cur.push(next);
            return cur;
        }, []);

        select.addAll(flattenedArgs.map(nodeableOrTextNode));

        // if this is a subquery then add reference to this column
        if (this.type === 'SUBQUERY') {
            for (const node of select.nodes as ColumnNode[]) {
                const name = node.alias || node.property || node.name;
                const col = new Column(node as any);
                col.name = name;
                col.property = name;
                col.table = this as any;
                col.star = undefined;
                const subQuery = (this as unknown as SubQuery<T, any>);
                if (subQuery[name] === undefined) {
                    subQuery[name] = col;
                }
                subQuery.columns.push(col);
            }
        }
        return this;
    }

    public star(): Column<unknown> {
        assert(this.type === 'SUBQUERY', 'star() can only be used on a subQuery');
        return new Column({
            star: true,
            table: this as any
        });
    }

    public from(node: INodeable[] | INodeable | string): this;
    public from(...nodes: INodeable[]): this;
    public from(...nodes: (string | INodeable | INodeable[])[]): this {
        const sourceNodes = Array.isArray(nodes[0]) ? (nodes[0] as Table<unknown>[]) : (nodes as Table<unknown>[]);

        for (const node of sourceNodes) {
            this.add(new FromNode().add(nodeableOrTextNode(node)));
        }

        return this;
    }

    public asOf(node: INodeable | string): this {
        this.add(new AsOfNode().add(nodeableOrTextNode(node)));
        return this;
    }

    public leftJoin(other: INodeable): JoinNode {
        assert(this.type === 'SUBQUERY', 'leftJoin() can only be used on a subQuery');
        return new JoinNode('LEFT', this, other.toNode());
    }

    public where(object: Partial<T> | Node[] | Node | string): this;
    public where(...nodes: Node[]): this;
    public where(...nodes: (Node[] | Node | Partial<T> | string)[]): this {
        if (nodes.length > 1) {
            // allow multiple where clause arguments
            const args = sliced(nodes as Node[]);
            for (const arg of args) {
                this.where(arg);
            }
            return this;
        } else {
            const node = nodes[0] as Node[] | Node | Partial<T> | string;
            // calling #where twice functions like calling #where & then #and
            if (this.whereClause) {
                return this.and(node);
            }
            this.whereClause = new WhereNode(this.table);
            this.whereClause.add(node);
            return this.add(this.whereClause);
        }
    }

    public or(object: Partial<T> | Node | string): this {
        if (!this.whereClause) {
            return this.where(object);
        }
        this.whereClause.or(object);
        return this;
    }

    public and(object: Partial<T> | Node[] | Node | string): this;
    public and(node: Node[] | Node | Partial<T> | string): this {
        if (!this.whereClause) {
            return this.where(node);
        }
        this.whereClause.and(node);
        return this;
    }

    public order(node: INodeable[] | INodeable): this;
    public order(...nodes: INodeable[]): this;
    public order(...nodes: (INodeable[] | INodeable)[]): this {
        const args: INodeable[] = getArrayOrArgsAsArray(nodes);
        let orderBy;
        if (args.length === 0) {
            return this;
        }
        if (this._orderBy) {
            orderBy = this._orderBy;
        } else {
            orderBy = this._orderBy = new OrderByNode();
            this.add(orderBy);
        }
        orderBy.addAll(args);
        return this;
    }

    public group(node: INodeable[] | INodeable): this;
    public group(...nodes: INodeable[]): this;
    public group(...nodes: (INodeable[] | INodeable)[]): this {
        const args: INodeable[] = getArrayOrArgsAsArray(nodes);
        const groupBy = new GroupByNode().addAll(args);
        return this.add(groupBy);
    }

    public having(node: INodeable[] | INodeable): this;
    public having(...nodes: INodeable[]): this;
    public having(...nodes: (INodeable[] | INodeable)[]): this {
        const args: INodeable[] = getArrayOrArgsAsArray(nodes);
        const having = new HavingNode().addAll(args);
        return this.add(having);
    }

    public insert(object: Column<unknown>[] | Column<unknown>): this;
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    public insert(object: PartialNodeable<T>[] | PartialNodeable<T>): this;
    public insert(...nodes: Column<unknown>[]): this;
    public insert(...nodes: (Column<unknown>[] | Column<unknown> | PartialNodeable<T>[] | PartialNodeable<T>)[]): this {
        let args = sliced(nodes) as Column<unknown>[];
        const object = nodes[0];

        if (Array.isArray(object)) {
            for (const col of object) {
                this.insert(col as any);
            }
            return this;
        } else if (!instanceofINodeable(object) && typeof object === 'object') {
            args = [];
            Object.keys(object).forEach((key) => {
                const col = this.table.get(key);
                if (col && !col.autoGenerated) {
                    args.push(col.value((object as any)[key]));
                }
            });
        }

        if (this.insertClause) {
            this.insertClause.add(args);
            return this;
        } else {
            this.insertClause = new InsertNode();
            this.insertClause.add(args);
            return this.add(this.insertClause);
        }
    }

    public replace(object: Column<unknown>[] | Column<unknown>): this;
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    public replace(object: Partial<T>[] | Partial<T>): this;
    public replace(...nodes: Column<unknown>[]): this;
    public replace(...nodes: (Column<unknown>[] | Column<unknown> | Partial<T>[] | Partial<T>)[]): this {
        let args = sliced(nodes) as Column<unknown>[];
        const object = nodes[0];

        if (Array.isArray(object)) {
            for (const col of object) {
                this.replace(col as any);
            }
            return this;
        } else if (!instanceofINodeable(object) && typeof object === 'object') {
            args = [];
            Object.keys(object).forEach((key) => {
                const col = this.table.get(key);
                if (col && !col.autoGenerated) {
                    args.push(col.value((object as any)[key]));
                }
            });
        }

        if (this.replaceClause) {
            this.replaceClause.add(args);
            return this;
        } else {
            this.replaceClause = new ReplaceNode();
            this.replaceClause.add(args);
            return this.add(this.replaceClause);
        }
    }

    public update(object: PartialNodeable<T>): this {
        const update = new UpdateNode();
        Object.keys(object).forEach((key) => {
            const col = this.table.get(key);
            if (col && !col.autoGenerated) {
                const val = (object as any)[key];
                update.add(col.value(ParameterNode.getNodeOrParameterNode(val)));
            }
        });
        return this.add(update);
    }

    public parameter(v: any): this {
        const param = ParameterNode.getNodeOrParameterNode(v) as ParameterNode;
        param.isExplicit = true;
        return this.add(param);
    }

    // eslint-disable-next-line @typescript-eslint/unified-signatures
    public delete(table: Table<unknown>[] | Table<unknown> | Partial<T>): this;
    public delete(): this;
    public delete(params?: Table<unknown> | Table<unknown>[] | Partial<T>): this {
        let result;
        if (params) {
            if (params instanceof Table || Array.isArray(params)) {
                // handle explicit delete queries:
                // e.g. post.delete(post).from(post) -> DELETE post FROM post
                // e.g. post.delete([post, user]).from(post) -> DELETE post, user FROM post
                const newParams = Array.isArray(params) ? params.map((table) => new TableNode(table)) : [new TableNode(params)];
                result = this.add(new DeleteNode().addAll(newParams));
            } else {
                // syntax sugar for post.delete().from(post).where(params)
                result = this.add(new DeleteNode()).where(params);
            }
        } else {
            result = this.add(new DeleteNode());
        }
        return result;
    }

    public returning(...args: any[]): this {
        const returning = new ReturningNode();
        if (args.length === 0) {
            returning.add(new TextNode('*'));
        } else {
            returning.addAll(getArrayOrArgsAsArray(args).map(nodeableOrTextNode));
        }

        return this.add(returning);
    }

    public onDuplicate(object: Partial<T>): this {
        const onDuplicate = new OnDuplicateNode();
        Object.keys(object).forEach((key) => {
            const col = this.table.get(key)!;
            let val;
            if (col && !col.autoGenerated) {
                val = (object as any)[key];
            }
            onDuplicate.add(col.value(ParameterNode.getNodeOrParameterNode(val)));
        });

        return this.add(onDuplicate);
    }

    public onConflict(options?: { constraint: string; update?: string[] } | { columns: string[]; update?: string[] }): this {
        const onConflict = new OnConflictNode(options);
        return this.add(onConflict);
    }

    public forUpdate(): this {
        assert(typeof this._select !== 'undefined', 'FOR UPDATE can be used only in a select statement');
        this.add(new ForUpdateNode());
        return this;
    }

    public forShare(): this {
        assert(typeof this._select !== 'undefined', 'FOR SHARE can be used only in a select statement');
        return this.add(new ForShareNode());
    }

    public create(): this
    public create(indexName: string): CreateIndexNode
    public create(indexName?: string): this | CreateIndexNode {
        if (this.indexesClause) {
            const createIndex = new CreateIndexNode(this.table, indexName!);
            this.add(createIndex);
            return createIndex;
        } else {
            return this.add(new CreateNode(this.table.isTemporary));
        }
    }

    public drop(): this;
    public drop(indexName: string): DropIndexNode;
    public drop(...columns: Column<unknown>[]): DropIndexNode;
    public drop(): this | DropIndexNode {
        if (this.indexesClause) {
            const args = sliced(arguments);
            const dropIndex = new DropIndexNode(this.table, args);
            this.add(dropIndex);
            return dropIndex;
        } else {
            return this.add(new DropNode(this.table));
        }
    }

    public truncate(): this {
        return this.add(new TruncateNode(this.table));
    }

    public distinct(): this {
        return this.add(new DistinctNode());
    }

    public distinctOn(...args: any[]): this {
        let distinctOn;
        if (this._distinctOn) {
            distinctOn = this._distinctOn;
        } else {
            const select = this.nodes.filter((node) => node.type === 'SELECT').shift();

            distinctOn = this._distinctOn = new DistinctOnNode();
            select!.add(distinctOn);
        }

        // allow things like .distinctOn(a.star(), [ a.id, a.name ])
        // this will flatten them into a single array
        const flattenedArgs = sliced(args).reduce((cur, next) => {
            if (Array.isArray(next)) {
                return cur.concat(next);
            }

            cur.push(next);
            return cur;
        }, []);

        distinctOn.addAll(flattenedArgs.map(nodeableOrTextNode));

        return this;
    }

    public alter(): this {
        return this.add(new AlterNode());
    }

    public rename(newName: Column<unknown> | string): this {
        const renameClause = new RenameNode();
        if (typeof newName === 'string') {
            newName = new Column({
                name: newName,
                table: this.table
            });
        }
        renameClause.add(newName.toNode());
        this.nodes[0].add(renameClause);
        return this;
    }

    public addColumn(column: Column<unknown> | string, dataType?: string): this {
        const addClause = new AddColumnNode();
        if (typeof column === 'string') {
            column = new Column({
                name: column,
                table: this.table
            });
        }
        if (dataType) {
            column.dataType = dataType;
        }
        addClause.add(column.toNode());
        this.nodes[0].add(addClause);
        return this;
    }

    public dropColumn(column: Column<unknown> | string): this {
        const dropClause = new DropColumnNode();
        if (typeof column === 'string') {
            column = new Column({
                name: column,
                table: this.table
            });
        }
        dropClause.add(column.toNode());
        this.nodes[0].add(dropClause);
        return this;
    }

    public renameColumn(oldColumn: Column<unknown> | string, newColumn: Column<unknown> | string): this {
        const renameClause = new RenameColumnNode();
        if (typeof oldColumn === 'string') {
            oldColumn = new Column({
                name: oldColumn,
                table: this.table
            });
        }
        if (typeof newColumn === 'string') {
            newColumn = new Column({
                name: newColumn,
                table: this.table
            });
        }
        renameClause.add(oldColumn.toNode());
        renameClause.add(newColumn.toNode());
        this.nodes[0].add(renameClause);
        return this;
    }

    public limit(count: unknown): this {
        return this.add(new ModifierNode(this, 'LIMIT', count));
    }

    public offset(count: unknown): this {
        return this.add(new ModifierNode(this, 'OFFSET', count));
    }

    public exists(): PrefixUnaryNode {
        assert(this.type === 'SUBQUERY', 'exists() can only be used on a subQuery');
        return new PrefixUnaryNode({
            left: this,
            operator: 'EXISTS'
        });
    }

    public notExists(): PrefixUnaryNode {
        assert(this.type === 'SUBQUERY', 'notExists() can only be used on a subQuery');
        return new PrefixUnaryNode({
            left: this,
            operator: 'NOT EXISTS'
        });
    }

    public ifExists(): this {
        this.nodes[0].unshift(new IfExistsNode());
        return this;
    }

    public ifNotExists(): this {
        this.nodes[0].unshift(new IfNotExistsNode());
        return this;
    }

    public orIgnore(): this {
        this.nodes[0].unshift(new OrIgnoreNode());
        return this;
    }

    public cascade(): this {
        this.nodes[0].add(new CascadeNode());
        return this;
    }

    public restrict(): this {
        this.nodes[0].add(new RestrictNode());
        return this;
    }

    public indexes(): this {
        this.indexesClause = new IndexesNode(this.table);
        return this.add(this.indexesClause);
    }

    public createView(viewName: string): this {
        this.add(new CreateViewNode(viewName));
        return this;
    }
}

type SubQueryExtensions<T, C extends Record<string, any>> = {
    join: (other: INodeable) => JoinNode;
} & {
    columns: Column<unknown>[]
} & {
    [P in NonNullable<keyof C>]: Column<C[P]>
};

export type SubQuery<T, C extends Record<string, any>> = Query<T> & SubQueryExtensions<T, C>;