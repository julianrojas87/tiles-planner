/**
 * Based on https://github.com/anvaka/ngraph.path/blob/main/a-star/NodeHeap.js
 * Copyright (c) 2017, Andrei Kashcha https://github.com/anvaka/ngraph.path/blob/main/LICENSE
 */

export class MinHeap {
    constructor(compare) {
        this._data = [];
        this._length = 0;
        this._compare = compare;
    }

    push(node) {
        this.data.push(node);
        this._setHeapIndex(node, this.length);
        this.length++;
        this._up(this.length - 1);
    }

    pop() {
        if (this.length === 0) return undefined;

        const top = this.data[0];
        this.length--;

        if (this.length > 0) {
            this.data[0] = this.data[this.length];
            this._setHeapIndex(this.data[0], 0);
            this._down(0);
        }
        this.data.pop();

        return top;
    }

    peek() {
        return this.data[0];
    }

    updateItem(pos) {
        this._down(pos);
        this._up(pos);
    }

    _up(pos) {
        const item = this.data[pos];

        while (pos > 0) {
            var parent = (pos - 1) >> 1;
            var current = this.data[parent];
            if (this.compare(item, current) >= 0) break;
            this.data[pos] = current;

            this._setHeapIndex(current, pos);
            pos = parent;
        }

        this.data[pos] = item;
        this._setHeapIndex(item, pos);
    }

    _down(pos) {
        const halfLength = this.length >> 1;
        const item = this.data[pos];

        while (pos < halfLength) {
            var left = (pos << 1) + 1;
            var right = left + 1;
            var best = this.data[left];

            if (right < this.length && this.compare(this.data[right], best) < 0) {
                left = right;
                best = this.data[right];
            }
            if (this.compare(best, item) >= 0) break;

            this.data[pos] = best;
            this._setHeapIndex(best, pos);
            pos = left;
        }

        this.data[pos] = item;
        this._setHeapIndex(item, pos);
    }

    _setHeapIndex(node, index) {
        node.heapIndex = index;
    }

    get data() {
        return this._data;
    }

    get length() {
        return this._length;
    }

    get compare() {
        return this._compare;
    }
}