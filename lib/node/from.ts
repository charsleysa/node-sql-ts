'use strict';

import { Node } from '.';

export class FromNode extends Node {
    public skipFromStatement: boolean = false;
    constructor() {
        super('FROM');
    }
}
