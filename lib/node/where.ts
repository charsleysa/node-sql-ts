'use strict';

import { BinaryNode, Node, TextNode } from '.';
import { INodeable, instanceofINodeable } from '../nodeable';
import { Table } from '../table';

const normalizeNode = (table: Table<unknown>, node: Node[] | Node | INodeable | object | string): Node => {
    if (typeof node === 'string') {
        return new TextNode(`(${node})`);
    } else if (Array.isArray(node)) {
        if (node.length === 0) {
            return new TextNode('(1 = 1)');
        } else {
            let result: Node | undefined;
            for (const subNode of node) {
                result = !result ? subNode : (result as any).and(subNode);
            }
            return result!;
        }
    } else if (!instanceofINodeable(node) && typeof node === 'object') {
        let result: Node | undefined;
        for (const colName in node) {
            if (colName in node) {
                const column = table.getColumn(colName)!;
                const query = column.equals((node as any)[colName]);
                result = !result ? query : (result as any).and(query);
            }
        }
        return result!;
    } else {
        return node.toNode();
    }
};

export class WhereNode extends Node {
    public table: Table<unknown>;
    constructor(table: Table<unknown>) {
        super('WHERE');
        this.table = table;
    }

    public add(node: Node[] | Node | INodeable | object | string) {
        const add = normalizeNode(this.table, node);
        return super.add(add);
    }

    public or(other: Node | object | string): void {
        const right = normalizeNode(this.table, other);
        // calling 'or' without an initial 'where'
        if (!this.nodes.length) {
            this.add(other);
        } else {
            this.nodes.push(
                new BinaryNode({
                    left: this.nodes.pop()!,
                    operator: 'OR',
                    right
                })
            );
        }
    }

    public and(other: Node[] | Node | object | string): void {
        const right = normalizeNode(this.table, other);
        this.nodes.push(
            new BinaryNode({
                left: this.nodes.pop()!,
                operator: 'AND',
                right
            })
        );
    }
}
