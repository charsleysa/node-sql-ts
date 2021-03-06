import { ModifierNode } from './modifier.js';
import { Node } from './node.js';

export class SelectNode extends Node {
    public msSQLLimitNode?: ModifierNode;
    public isDistinct: boolean;
    constructor() {
        super('SELECT');
        // used when processing LIMIT clauses in MSSQL
        this.msSQLLimitNode = undefined;
        // set to true when a DISTINCT is used on the entire result set
        this.isDistinct = false;
    }
}
