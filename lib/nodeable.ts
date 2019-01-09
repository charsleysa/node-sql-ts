import { Node } from './node';

export interface INodeable {
    toNode(): Node;
}

export function instanceofINodeable(o: object): o is INodeable {
    return typeof o === 'object' && o !== null && 'toNode' in o;
}
