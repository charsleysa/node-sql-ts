'use strict';

import { Node } from '.';

interface Interval {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

export class IntervalNode extends Node {
    public years: number;
    public months: number;
    public days: number;
    public hours: number;
    public minutes: number;
    public seconds: number;
    constructor(args: Interval[]) {
        super('INTERVAL');
        const interval = args[0] || {};
        this.years = interval.years;
        this.months = interval.months;
        this.days = interval.days;
        this.hours = interval.hours;
        this.minutes = interval.minutes;
        this.seconds = interval.seconds;
    }
}
