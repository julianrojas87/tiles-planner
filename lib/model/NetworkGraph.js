export class NetworkGraph {
    constructor() {
        this._nodes = new Map();
    }

    get(id) {
        return this.nodes.get(id);
    }

    has(id) {
        return this.nodes.has(id);
    }

    setNode(node) {
        let n = null;
        if (this.nodes.has(node.id)) {
            n = this.nodes.get(node.id);
        } else {
            n = {
                id: node.id,
                cost: null,
                coordinates: new Array(2),
                nextNodes: new Set(),
                prevNodes: new Set()
            };
        }

        if (node.coordinates) n.coordinates = node.coordinates;
        if (node.long) n.coordinates[0] = parseFloat(node.long);
        if (node.lat) n.coordinates[1] = parseFloat(node.lat);
        if (node.cost) n.cost = parseFloat(node.cost);
        if (node.nextNode) {
            // Register forward edge
            n.nextNodes.add(node.nextNode);
            // Call for registering backward edge
            this.setNode({ id: node.nextNode, prevNode: node.id });
        }
        // Register backward edge
        if(node.prevNode) n.prevNodes.add(node.prevNode);

        this.nodes.set(node.id, n);
    }

    get nodes() {
        return this._nodes;
    }

    set nodes(n) {
        this._nodes = n;
    }
}