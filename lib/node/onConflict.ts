import { INodeable } from '../nodeable.js';
import { Node } from './node.js';

export class OnConflictNode extends Node {
    public columns?: string[];
    public constraint?: string;
    public where?: Node;
    public update?: string[];

    constructor(config: { columns?: string[]; constraint?: string; where?: INodeable; update?: string[] } = {}) {
        super('ONCONFLICT');
        this.columns = config.columns;
        this.constraint = config.constraint;
        this.where = config.where?.toNode();
        this.update = config.update;
    }
}
