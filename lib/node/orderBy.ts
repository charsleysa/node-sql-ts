'use strict';

import { ModifierNode, Node } from '.';

export class OrderByNode extends Node {
    public msSQLOffsetNode?: ModifierNode;
    public msSQLLimitNode?: ModifierNode;
    constructor() {
        super('ORDER BY');
        // used when processing OFFSET and LIMIT clauses in MSSQL
        this.msSQLOffsetNode = undefined;
        this.msSQLLimitNode = undefined;
    }
}
