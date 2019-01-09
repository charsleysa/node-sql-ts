'use strict';

import { Node, TextNode } from '.';

export class OrderByValueNode extends Node {
    public value: Node;
    public direction?: TextNode;
    constructor(config: { value: Node; direction?: TextNode }) {
        super('ORDER BY VALUE');
        this.value = config.value;
        this.direction = config.direction;
    }
}
