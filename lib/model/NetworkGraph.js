export class NetworkGraph {
    constructor() {
        this._nodes = new Map();
    }

    get(id) {
        return this.nodes.get(id);
    }

    setNode(node) {
        let n = null;
        if (this.nodes.has(node.id)) {
            n = this.nodes.get(node.id);
        } else {
            n = {
                id: node.id,
                nextNodes: new Set(),
                length: null,
                coordinates: new Array(2)
            };
        }

        if (node.coordinates) n.coordinates = node.coordinates;
        if (node.long) n.coordinates[0] = parseFloat(node.long);
        if (node.lat) n.coordinates[1] = parseFloat(node.lat);
        if (node.length) n.length = parseFloat(node.length);
        if (node.nextNode) n.nextNodes.add(node.nextNode);

        this.nodes.set(node.id, n);
    }

    get nodes() {
        return this._nodes;
    }

    set nodes(n) {
        this._nodes = n;
    }
}