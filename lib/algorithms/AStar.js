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

        // Refresh metadata register
        this.metadata = this.freshMetadata();
        // Register initial time
        this.metadata.executionTime = new Date();
        // Priority queue
        const queue = new MinHeap((a, b) => { return a.fScore - b.fScore });
        /**
         * Object pool to prevent garbage collection during query processing
         * and pollution of original network graph node objects.
         * This comes at the cost of memory.
         * */
        const pool = new Map();

        // Fetch tiles containing from and to nodes (if we don't have them already)
        if(!this.NG.has(from.id) || (to && !this.NG.has(to.id))) {
            await Promise.all([
                this.fetchNodeTile(from),
                this.fetchNodeTile(to)
            ]);
        }

        const FROM = this.NG.get(from.id);
        // This means that the FROM node is not connected to the rest of the graph 
        if(!FROM) return null;

        // In case there is no concrete target node
        const TO = (to && this.NG.get(to.id)) || {};
        this.logger.debug("FROM (NG): %O", FROM);
        this.logger.debug("TO (NG): %O", TO);

        // Create pool object for FROM node
        pool.set(FROM.id, {
            id: FROM.id,
            // Distance from source to source is 0
            gScore: 0,
            // For the first node, fScore is completely heuristic
            fScore: this.heuristic(FROM, TO)
        });

        // Add source node to the queue
        queue.push(pool.get(FROM.id));

        // Main loop
        while (queue.length > 0) {
            // Check if process has been killed
            if(this.killed)  {
                this.killed = false;
                return null;
            }

            // Increase Dijkstra rank
            this.metadata.dijkstraRank++;
            // Get current node from queue
            const cameFrom = queue.pop();
            const cameFromNG = this.NG.get(cameFrom.id);
            this.logger.debug("cameFrom (pool): %O", cameFrom);
            this.logger.debug("cameFrom (NG): %O", cameFromNG);


            // Check if we arrived to the target
            if (cameFrom.id === TO.id || this.metadata.dijkstraRank >= targetRank) {
                return this.rebuildPath(cameFrom);
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
                        || !this.tileCache.has(`${this.zoom}/${Utils.longLat2Tile(neighborNG.coordinates, this.zoom)}`)) {
                        await this.fetchNodeTile(neighborNG);
                        // Refresh neighbor with fetched data
                        neighborNG = this.NG.get(neighborId);
                        this.logger.debug("neighbor(refreshed): %O", neighborNG);
                    }

                    // Calculate tentative gScore for this neighbor
                    const tgScore = cameFrom.gScore + this.distance(neighborNG, cameFromNG);
                    this.logger.debug("neighbor.tgScore: %s", tgScore);
                    const neighbor = pool.get(neighborId);

                    if (!neighbor || tgScore < neighbor.gScore) {
                        // We found a (shorter) path to this neighbor!
                        if (pool.has(neighborId)) {
                            // Update its G and F scores
                            neighbor.gScore = tgScore;
                            neighbor.fScore = tgScore + this.heuristic(neighborNG, TO);
                            neighbor.previous = cameFrom;
                        } else {
                            // First time we check this node
                            pool.set(neighborId, {
                                id: neighborId,
                                gScore: tgScore,
                                fScore: tgScore + this.heuristic(neighborNG, TO),
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
            this.logger.debug(`*********************************END OF DIJKSTRA RANK ${this.metadata.dijkstraRank}********************************************************`);
        }

        // We couldn't find a path :(
        return null;
    }

    rebuildPath(cameFrom) {
        const path = [Object.assign({}, this.NG.get(cameFrom.id))];
        let previous = cameFrom.previous;

        while (previous) {
            path.unshift(Object.assign({}, this.NG.get(previous.id)));
            previous = previous.previous;
        }

        // Calculated elapsed time
        this.metadata.executionTime = new Date() - this.metadata.executionTime;
        // Clean up and calculate total path cost
        for(let i = 0; i < path.length - 1; i++) {
            delete path[i].nextNodes;
            delete path[i].prevNodes;
            // Calculate cumulative cost of the path
            this.metadata.cost += this.distance(path[i], path[i + 1]);
        }

        return { path, metadata: this.metadata };
    }

    get distance() {
        return this._distance;
    }

    get heuristic() {
        return this._heuristic;
    }
}