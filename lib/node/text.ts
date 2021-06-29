import { Node } from './node.js';

export class TextNode extends Node {
    public text: string;
    constructor(text: string) {
        super('TEXT');
        this.text = text;
    }
}