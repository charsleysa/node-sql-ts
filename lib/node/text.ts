'use strict';

import { Node } from '.';

export class TextNode extends Node {
    public text: string;
    constructor(text: string) {
        super('TEXT');
        this.text = text;
    }
}
