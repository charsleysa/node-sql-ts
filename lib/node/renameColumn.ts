'use strict';

import { Node } from '.';

export class RenameColumnNode extends Node {
    constructor() {
        super('RENAME COLUMN');
    }
}
