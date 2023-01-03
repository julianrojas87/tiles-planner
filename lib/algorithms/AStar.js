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

        // Variable that records the number of main loop iterations needed to find a path
        let dijkstraRank = 0;
        /**
         * Object pool to prevent garbage collection during query processing
         * and pollution of original network graph node objects.
         * This comes at the cost of memory.
         * */
        const pool = new Map();
        // Priority queue
        const queue = new MinHeap((a, b) => { return a.fScore - b.fScore });

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

        // Add source node to the queue
        queue.push(pool.get(FROM.id));

        // Main loop
        while (queue.length > 0) {
            // Increase Dijkstra rank
            dijkstraRank++;
            // Get current node from queue
            const cameFrom = queue.pop();
            const cameFromNG = this.NG.get(cameFrom.id);
            this.logger.debug("cameFrom (pool): %O", cameFrom);
            this.logger.debug("cameFrom (NG): %O", cameFromNG);


            // Check if we arrived to the target
            if (cameFrom.id === TO.id) {
                return this.rebuildPath(cameFrom);
            }

            // Skip if no there are no outgoing edges from this node, it means it is a dead end.
            if (cameFromNG.nextNodes.size > 0) {
                for (const neighborId of cameFromNG.nextNodes) {
                    let neighborNG = this.NG.get(neighborId);
                    this.logger.debug("neighborNG: %O", neighborNG);

                    /**
                     * Is possible that this next node belongs to a tile we haven't fetched yet.
                     * We know this is the case when the next node's tile is not cached
                     * and the next nodes are unknown. So get on it and fetch the tile!
                    */
                    if (!this.tileCache.has(`${this.zoom}/${Utils.longLat2Tile(neighborNG.coordinates, this.zoom)}`)
                        && neighborNG.nextNodes.size <= 0) {
                        await this.fetchNodeTile(neighborNG);
                        // Refresh neighbor with fetched data
                        neighborNG = this.NG.get(neighborId);
                        this.logger.debug("neighbor(refreshed): %O", neighborNG);
                    }

                    // Calculate tentative gScore for this neighbor
                    const tgScore = cameFrom.gScore + this.distance(neighborNG);
                    this.logger.debug("neighbor.tgScore: %s", tgScore);
                    const neighbor = pool.get(neighborId);

                    if (!neighbor || tgScore < neighbor.gScore) {
                        // We found a (shorter) path to this neighbor!
                        pool.set(neighborId, {
                            id: neighborId,
                            gScore: tgScore,
                            fScore: tgScore + this.heuristic(neighborNG.coordinates, TO.coordinates),
                            previous: cameFrom
                        });
                        this.logger.debug("Shorter path found for %s with gScore %s", neighborId, pool.get(neighborId).gScore);

                        // Add to the queue
                        queue.push(pool.get(neighborId));                       
                        this.logger.debug("Queued %s with fScore %s", neighborId, pool.get(neighborId).fScore);
                    }
                }
            }
            this.logger.debug(`*********************************END OF DIJKSTRA RANK ${dijkstraRank}********************************************************`);
        }

        // We couldn't find a path :(
        return null;
    }

    rebuildPath(cameFrom) {
        const path = [this.NG.get(cameFrom.id)];
        let previous = cameFrom.previous;

        while (previous) {
            path.unshift(this.NG.get(previous.id));
            previous = previous.previous;
        }

        return path;
    }

    get distance() {
        return this._distance;
    }

    get heuristic() {
        return this._heuristic;
    }
}