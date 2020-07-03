'use strict';

import defaults from 'lodash/defaults';
import { Node } from '.';

export class AliasNode extends Node {

    public static AliasMixin = {
        as(this: Node, alias: string) {
            // create an alias node
            const aliasNode = new AliasNode(this, alias);

            // defaults the properties of the aliased node
            defaults(aliasNode, this);

            return aliasNode;
        }
    };
    public value: Node;
    public alias: string;
    constructor(value: Node, alias: string) {
        super('ALIAS');

        this.value = value;
        this.alias = alias;
    }
}

export interface IAliasMixin {
    as(alias: string): AliasNode;
}
