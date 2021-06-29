import type { Node } from './node/node.js';

export interface INodeable {
    toNode(): Node;
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function instanceofINodeable(o: unknown): o is INodeable {
    return typeof o === 'object' && o !== null && 'toNode' in o;
}

export type PartialNodeable<T> = { [P in keyof T]?: T[P] | INodeable | Buffer | null };
