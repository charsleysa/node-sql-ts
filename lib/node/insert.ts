'use strict';

import { ColumnNode, DefaultNode, Node, ParameterNode } from '.';
import { Column } from '../column';
import { INodeable } from '../nodeable';

export class InsertNode extends Node {
    public names: string[];
    public columns: ColumnNode[];
    public valueSets: { [key: string]: ColumnNode }[];
    constructor() {
        super('INSERT');
        this.names = [];
        this.columns = [];
        this.valueSets = [];
    }

    public add(nodes: Column<unknown>[] | Node | INodeable | string): this {
        if (!Array.isArray(nodes)) {
            throw new Error('Not an array of column instances');
        }
        let hasColumns = false;
        let hasValues = false;
        const values: { [key: string]: ColumnNode } = {};
        nodes.forEach((node) => {
            const column = node.toNode();
            const name = column.name;
            const idx = this.names.indexOf(name);
            if (idx < 0) {
                this.names.push(name);
                this.columns.push(column);
            }
            hasColumns = true;
            hasValues = hasValues || column.value !== undefined;
            values[name] = column;
        });

        // When none of the columns have a value, it's ambiguous whether the user
        // intends to insert a row of default values or append a SELECT statement
        // later.  Resolve the ambiguity by assuming that if no columns are specified
        // it is a row of default values, otherwise a SELECT will be added.
        if (hasValues || !hasColumns) {
            this.valueSets.push(values);
        }

        return this;
    }

    /*
     * Get parameters for all values to be inserted. This function
     * handles handles bulk inserts, where keys may be present
     * in some objects and not others. When keys are not present,
     * the insert should refer to the column value as DEFAULT.
     */
    public getParameters() {
        return this.valueSets.map((nodeDict) => {
            const set: Node[] = [];
            this.names.forEach((name) => {
                const node = nodeDict[name];
                if (node) {
                    set.push(ParameterNode.getNodeOrParameterNode(node.value));
                } else {
                    set.push(new DefaultNode());
                }
            });
            return set;
        });
    }
}
