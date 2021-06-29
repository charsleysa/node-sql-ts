import { Node } from './node.js';

export class CreateViewNode extends Node {
    public options: { viewName: string };

    constructor(viewName: string) {
        super('CREATE VIEW');

        this.options = { viewName };
    }
}
