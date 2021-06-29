import { Node } from './node.js';
import { TextNode } from './text.js';
import { classMap } from './valueExpression.js';

export class OrderByValueNode extends Node {
    public value: Node;
    public direction?: TextNode;
    constructor(config: { value: Node; direction?: TextNode }) {
        super('ORDER BY VALUE');
        this.value = config.value;
        this.direction = config.direction;
    }
}

classMap.set('ORDER BY VALUE', OrderByValueNode);
