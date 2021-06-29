import isFunction from 'lodash/isFunction.js';
import padStart from 'lodash/padStart.js';

import { OrderByNode } from '../node/orderBy.js';
import { Dialect } from './dialect.js';

const dateToStringUTC = (date: Date) => {
    let year = date.getUTCFullYear();
    const isBCYear = year < 1;
    if (isBCYear) year = Math.abs(year) + 1; // negative years are 1 off their BC representation

    let ret =
        padStart(String(year), 4, '0') +
        '-' +
        padStart(String(date.getUTCMonth() + 1), 2, '0') +
        '-' +
        padStart(String(date.getUTCDate()), 2, '0') +
        'T' +
        padStart(String(date.getUTCHours()), 2, '0') +
        ':' +
        padStart(String(date.getUTCMinutes()), 2, '0') +
        ':' +
        padStart(String(date.getUTCSeconds()), 2, '0') +
        '.' +
        padStart(String(date.getUTCMilliseconds()), 3, '0');

    ret += 'Z';
    if (isBCYear) ret += ' BC';
    return ret;
}

/**
 * Config can contain:
 *
 * nullOrder: 'first' | 'last'
 *
 * @param config
 * @constructor
 */
export class Postgres extends Dialect<{ nullOrder?: string }> {
    constructor(config: { nullOrder?: string }) {
        super(config);
    }

    protected createSubInstance() {
        return new Postgres(this.config);
    }

    public _getParameterValue(
        value: null | boolean | number | string | any[] | Date | Buffer | Record<string, unknown>,
        quoteChar?: string
    ): string | number {
        if ('object' === typeof value && Array.isArray(value)) {
            // naive check to see if this is an array of objects, which
            // is handled differently than an array of primitives
            if (value.length && 'object' === typeof value[0] && !isFunction(value[0].toISOString) && !Array.isArray(value[0])) {
                value = `'${JSON.stringify(value)}'`;
            } else {
                // In a Postgres array, strings must be double-quoted
                value = value.map((item) => this._getParameterValue(item, '"'));
                value = `'{${(value as any[]).join(',')}}'`;
            }
        } else if ('object' === typeof value && value instanceof Date) {
            // Date object's default toString format does not get parsed well
            // Handle dates using custom dateToString method for postgres
            value = this._getParameterValue(dateToStringUTC(value), quoteChar);
        } else {
            value = super._getParameterValue(value, quoteChar);
        }
        // value has been converted at this point
        return value;
    }
    public visitOrderBy(orderByNode: OrderByNode): string[] {
        const result = ['ORDER BY', orderByNode.nodes.map(this.visit.bind(this)).join(', ')];
        if (this.config.nullOrder) {
            result.push('NULLS ' + this.config.nullOrder.toUpperCase());
        }
        return result;
    }
}
