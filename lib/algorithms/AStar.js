/**
 * Based on https://github.com/anvaka/ngraph.path/blob/main/a-star/a-star.js
 * Copyright (c) 2017, Andrei Kashcha https://github.com/anvaka/ngraph.path/blob/main/LICENSE
 * 
 * Adapted for path fining over tile interfaces
 * by @julianrojas87
 * Copyright (c) 2023, Julián Rojas
 */

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

    async findPath(from, to, targetRank = Number.POSITIVE_INFINITY) {
        this.logger.debug("from: %O", from);
        this.logger.debug("to: %O", to);

        const metadata = {
            // Amount of data transferred to solve this query
            byteCount: 0,
            // Number of tile requests done to solve this query
            requestCount: 0
        };
        // Variable that records the number of main loop iterations needed to find a path
        let dijkstraRank = 0;
        // Priority queue
        const queue = new MinHeap((a, b) => { return a.fScore - b.fScore });
        /**
         * Object pool to prevent garbage collection during query processing
         * and pollution of original network graph node objects.
         * This comes at the cost of memory.
         * */
        const pool = new Map();

        // Fetch tiles containing from and to nodes (if not cached)
        await Promise.all([
            this.fetchNodeTile(from, metadata),
            this.fetchNodeTile(to, metadata)
        ]);

        const FROM = this.NG.get(from.id);
        // In case there is no concrete target node
        const TO = this.NG.get(to.id) || {};
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
            if (cameFrom.id === TO.id || dijkstraRank >= targetRank) {
                return this.rebuildPath(cameFrom, metadata);
            }

            // Skip if no there are no outgoing edges from this node, it means it is a dead end.
            if (cameFromNG.nextNodes.size > 0) {
                for (const neighborId of cameFromNG.nextNodes) {
                    // Get neighbor node object from Network Graph
                    let neighborNG = this.NG.get(neighborId);
                    this.logger.debug("neighborNG: %O", neighborNG);

                    /**
                     * Is possible that this neighbor node belongs to a tile we haven't fetched yet.
                     * We know this is the case when we don't know its next nodes
                     * and the tile it belongs to is not cached. So get on it and fetch the tile!
                    */
                    if (neighborNG.nextNodes.size <= 0
                        && !this.tileCache.has(`${this.zoom}/${Utils.longLat2Tile(neighborNG.coordinates, this.zoom)}`)) {
                        await this.fetchNodeTile(neighborNG, metadata);
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
                        if (pool.has(neighborId)) {
                            // Update its G and F scores
                            neighbor.gScore = tgScore;
                            neighbor.fScore = tgScore + this.heuristic(neighborNG.coordinates, TO.coordinates);
                            neighbor.previous = cameFrom;
                        } else {
                            // First time we check this node
                            pool.set(neighborId, {
                                id: neighborId,
                                gScore: tgScore,
                                fScore: tgScore + this.heuristic(neighborNG.coordinates, TO.coordinates),
                                previous: cameFrom
                            });
                        }
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

    rebuildPath(cameFrom, metadata) {
        const path = [this.NG.get(cameFrom.id)];
        let previous = cameFrom.previous;

        while (previous) {
            path.unshift(this.NG.get(previous.id));
            previous = previous.previous;
        }

        return { path, metadata };
    }

    get distance() {
        return this._distance;
    }

    get heuristic() {
        return this._heuristic;
    }
}