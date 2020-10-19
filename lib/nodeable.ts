import { Node } from './node';

export interface INodeable {
    toNode(): Node;
}

export function instanceofINodeable(o: unknown): o is INodeable {
    return typeof o === 'object' && o !== null && 'toNode' in o;
}

export type PartialNodeable<T> = { [P in keyof T]?: T[P] | INodeable | Buffer };
