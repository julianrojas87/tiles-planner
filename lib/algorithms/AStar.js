import { PathFinder } from "./PathFinder.js";
import Utils from "../utils/Utils.js";
import { MinHeap } from "../model/MinHeap.js";

export class AStar extends PathFinder {
    constructor(props) {
        super(props);
        // Default distance gives a constant increase from one node to the next 
        this._distance = props.distance || Utils.defaultDistance;
        // Default heuristic makes the algorithm equivalent to Dijkstra's
        this._heuristic = props.heuristic || Utils.defaultHeuristic;
    }

    async findPath(from, to) {
        this.logger.debug("from: %O", from);
        this.logger.debug("to: %O", to);
        // Priority queue
        const queue = new MinHeap((a, b) => { return a.fScore - b.fScore });
        // Set to store visited nodes
        const explored = new Set();

        // Fetch tiles containing from and to nodes (if not cached)
        await Promise.all([
            this.fetchNodeTile(from),
            this.fetchNodeTile(to)
        ]);

        const FROM = this.NG.get(from.id);
        const TO = this.NG.get(to.id);
        this.logger.debug("FROM (from NG): %O", FROM);
        this.logger.debug("TO (from NG): %O", TO);
        
        // Distance from source to source is 0
        FROM.gScore = 0
        // For the first node, fScore is completely heuristic.
        FROM.fScore = this.heuristic(FROM.coordinates, TO.coordinates);
        this.logger.debug("f(FROM) = %s", FROM.fScore);
        // Add source node to the queue
        queue.push(FROM);

        // Main loop
        while(queue.length > 0) {
            const cameFrom = queue.pop();
        }
    }

    get distance() {
        return this._distance;
    }

    get heuristic() {
        return this._heuristic;
    }
}