import { AStar } from "./AStar.js";
import { MinHeap } from "../model/MinHeap.js";

export class NBAStar extends AStar {
    constructor(props) {
        super(props);
    }

    async findPath(from, to) {
        this.logger.debug("from: %O", from);
        this.logger.debug("to: %O", to);

        /**
         * Object pool to prevent garbage collection during query processing
         * and pollution of original network graph node objects.
         * This comes at the cost of memory.
         * */
        const pool = new Map();
        // Forward priority queue
        const forwardQueue = new MinHeap((a, b) => { return a.fScore - b.fScore });
        // Backward priority queue
        const backwardQueue = new MinHeap((a, b) => { return a.fScore - b.fScore });

        // Fetch tiles containing from and to nodes (if not cached)
        await Promise.all([
            this.fetchNodeTile(from),
            this.fetchNodeTile(to)
        ]);

        const FROM = this.NG.get(from.id);
        const TO = this.NG.get(to.id);
        this.logger.debug("FROM (NG): %O", FROM);
        this.logger.debug("TO (NG): %O", TO);

        // Create pool object for FROM node
        pool.set(FROM.id, {
            id: FROM.id,
            // Distance from source to source is 0
            gScore: 0,
            // For the first node, fScore is completely heuristic
            fScore: this.heuristic(FROM.coordinates, TO.coordinates)
        });

        // Create pool object for TO node
        pool.set(TO.id, {
            id: TO.id,
            // Distance from source to source is 0
            gScore: 0,
            // For the first node, fScore is completely heuristic
            fScore: this.heuristic(TO.coordinates, FROM.coordinates)
        });

        // Add source nodes to their respective queues
        forwardQueue.push(pool.get(FROM.id));
        backwardQueue.push(pool.get(TO.id));

        // This variable will be the meeting point
        let meetingPoint = null;
        // The smallest path length seen so far is stored here:
        let lMin = Number.POSITIVE_INFINITY;
        // Reference FScores
        let fFScore = pool.get(FROM.id).fScore;
        let bFScore = pool.get(TO.id).fScore;

        // Main loop
        while (forwardQueue.length > 0 && backwardQueue.length > 0) {
            // Current node from the (forward or backward) queue
            let cameFrom = null;
            let forward = false;

            if (forwardQueue.length < backwardQueue.length) {
                cameFrom = forwardQueue.pop();
                forward = true;

            } else {
                cameFrom = backwardQueue.pop();
            }
            this.logger.debug("(%s) cameFrom (pool): %O", this.searchLabel(forward), cameFrom);

            await this.visitNeighbors({
                FROM, TO,
                cameFrom,
                fScore: forward ? fFScore : bFScore,
                forward
            });
        }
    }

    async visitNeighbors({ FROM, TO, cameFrom, fScore, forward }) {
        const cameFromNG = this.NG.get(cameFrom.id);
        this.logger.debug("(%s) cameFrom (NG): %O", this.searchLabel(forward), cameFromNG);
    }

    searchLabel(forward) {
        return forward ? "FORWARD" : "BACKWARD"
    }
}