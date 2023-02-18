/**
 * Based on https://github.com/anvaka/ngraph.path/blob/main/a-star/nba/index.js
 * Copyright (c) 2017, Andrei Kashcha https://github.com/anvaka/ngraph.path/blob/main/LICENSE
 * 
 * Adapted for path finding over tile interfaces
 * by @julianrojas87
 * Copyright (c) 2023, Julián Rojas
 */

import { AStar } from "./AStar.js";
import Utils from "../utils/Utils.js";
import { MinHeap } from "../model/MinHeap.js";

export class NBAStar extends AStar {
    constructor(props) {
        super(props);
        // Reference F scores to be used by their opposite search
        this._fFScore = null;
        this._bFScore = null;
        // The smallest path length seen
        this._L = Number.POSITIVE_INFINITY;
        // This variable will hold the meeting point
        this._M = null;
    }

    async findPath(from, to) {
        //this.logger.debug("from: %O", from);
        //this.logger.debug("to: %O", to);

        // Refresh metadata register and calculation values
        this.refreshValues();
        // Register initial time
        this.metadata.executionTime = new Date();
        /**
         * Object pool to prevent garbage collection during query processing
         * and pollution of original network graph node objects.
         * This comes at the cost of memory.
         * */
        const pool = new Map();
        // Forward priority queue
        const forwardQueue = new MinHeap(
            (a, b) => { return a.fFScore - b.fFScore },
            (node, i) => { return node.fIndex = i }
        );
        // Backward priority queue
        const backwardQueue = new MinHeap(
            (a, b) => { return a.bFScore - b.bFScore },
            (node, i) => { return node.bIndex = i }
        )

        // Fetch tiles containing from and to nodes (if not cached)
        if (!this.NG.has(from.id) || (to && !this.NG.has(to.id))) {
            await Promise.all([
                this.fetchNodeTile(from),
                this.fetchNodeTile(to)
            ]);
        }

        const FROM = this.NG.get(from.id);
        const TO = this.NG.get(to.id);
        //this.logger.debug("FROM (NG): %O", FROM);
        //this.logger.debug("TO (NG): %O", TO);

        // Create pool object for FROM node
        pool.set(FROM.id, {
            id: FROM.id,
            // Distance from source to source is 0
            fGScore: 0,
            // Distance from target to source is INFINITY
            bGScore: Number.POSITIVE_INFINITY,
            // For the first node, forward FScore is completely heuristic
            fFScore: this.heuristic(FROM.coordinates, TO.coordinates),
            bFScore: Number.POSITIVE_INFINITY,
            fIndex: -1,
            bIndex: -1
        });

        // Create pool object for TO node
        pool.set(TO.id, {
            id: TO.id,
            // Distance from target to source is INFINITY
            fGScore: Number.POSITIVE_INFINITY,
            // Distance from target to target is 0
            bGScore: 0,
            // For the first node, backward FScore is completely heuristic
            fFScore: Number.POSITIVE_INFINITY,
            bFScore: this.heuristic(TO.coordinates, FROM.coordinates),
            fIndex: -1,
            bIndex: -1
        });

        // Add source nodes to their respective queues
        forwardQueue.push(pool.get(FROM.id));
        backwardQueue.push(pool.get(TO.id));

        // Update reference F scores
        this.fFScore = pool.get(FROM.id).fFScore;
        this.bFScore = pool.get(TO.id).bFScore;

        // Main loop
        while (forwardQueue.length > 0 && backwardQueue.length > 0) {
            // Check if process has been killed
            if(this.killed)  {
                this.killed = false;
                return null;
            }

            // Current node from the (forward or backward) queue
            let cameFrom = null;
            let forward = false;

            // Increase Dijkstra rank
            this.metadata.dijkstraRank++;

            if (forwardQueue.length < backwardQueue.length) {
                cameFrom = forwardQueue.pop();
                forward = true;

            } else {
                cameFrom = backwardQueue.pop();
            }
            //this.logger.debug("(%s) cameFrom (pool): %O", this.searchLabel(forward), cameFrom);

            await this.visitNeighbors(
                FROM, TO,
                cameFrom,
                pool,
                forward ? forwardQueue : backwardQueue,
                forward
            );
            //this.logger.debug(`******************************END OF ${this.searchLabel(forward)} iteration*****************************`);
        }

        // Check if we found a meeting point
        if (this.M) {
            return this.rebuildPath();
        } else {
            // We couldn't find a path :(
            return null;
        }
    }

    refreshValues() {
        this.metadata = this.freshMetadata();
        this.fFScore = null;
        this.bFScore = null;
        this.L = Number.POSITIVE_INFINITY;
        this.M = null;
    }

    async visitNeighbors(FROM, TO, cameFrom, pool, queue, forward) {
        const cameFromNG = this.NG.get(cameFrom.id);
        //this.logger.debug("(%s) cameFrom (NG): %O", this.searchLabel(forward), cameFromNG);

        const fScore = forward ? this.fFScore : this.bFScore;
        const cfGScore = forward ? cameFrom.fGScore : cameFrom.bGScore;
        const nFScore = forward ? cameFrom.fFScore : cameFrom.bFScore;
        const searchSource = forward ? FROM.coordinates : TO.coordinates;
        const searchTarget = forward ? TO.coordinates : FROM.coordinates;

        // Condition to determine if a neighbor node is stabilized or rejected
        if (nFScore < this.L && (cfGScore + fScore - this.heuristic(cameFromNG.coordinates, searchSource)) < this.L) {
            for (const neighborId of forward ? cameFromNG.nextNodes : cameFromNG.prevNodes) {
                // Get neighbor node object from Network Graph
                let neighborNG = this.NG.get(neighborId);
                //this.logger.debug("(%s) neighborNG: %O", this.searchLabel(forward), neighborNG);

                /**
                     * Is possible that this neighbor node belongs to a tile we haven't fetched yet.
                     * We know this is the case when we don't know its neighbor nodes
                     * and the tile it belongs to is not cached. So get on it and fetch the tile!
                */
                const nextLength = forward ? neighborNG.nextNodes.size : neighborNG.prevNodes.size;
                if (!this.tileCache.has(`${this.zoom}/${Utils.longLat2Tile(neighborNG.coordinates, this.zoom)}`)
                    || nextLength <= 0) {
                    await this.fetchNodeTile(neighborNG);
                    // Refresh neighbor with fetched data
                    neighborNG = this.NG.get(neighborId);
                    //this.logger.debug("(%s) neighbor(refreshed): %O", this.searchLabel(forward), neighborNG);
                }

                // Calculate tentative gScore for this neighbor
                const tGScore = cfGScore + this.distance(neighborNG);
                let neighbor = pool.get(neighborId);
                const nGScore = neighbor ? forward ? neighbor.fGScore : neighbor.bGScore : Number.POSITIVE_INFINITY;
                //this.logger.debug("(%s) neighbor.tgScore: %s", this.searchLabel(forward), tGScore);

                if (!neighbor || tGScore < nGScore) {
                    // We found a (shorter) path to this neighbor!
                    if (pool.has(neighborId)) {
                        if (forward) {
                            neighbor.fGScore = tGScore;
                            neighbor.fFScore = tGScore + this.heuristic(neighborNG.coordinates, searchTarget);
                            neighbor.previous = cameFrom;
                        } else {
                            neighbor.bGScore = tGScore;
                            neighbor.bFScore = tGScore + this.heuristic(neighborNG.coordinates, searchTarget);
                            neighbor.next = cameFrom;
                        }
                    } else {
                        if (forward) {
                            pool.set(neighborId, {
                                id: neighborId,
                                fGScore: tGScore,
                                bGScore: Number.POSITIVE_INFINITY,
                                fFScore: tGScore + this.heuristic(neighborNG.coordinates, searchTarget),
                                bFScore: Number.POSITIVE_INFINITY,
                                previous: cameFrom,
                                fIndex: -1,
                                bIndex: -1
                            });
                        } else {
                            pool.set(neighborId, {
                                id: neighborId,
                                fGScore: Number.POSITIVE_INFINITY,
                                bGScore: tGScore,
                                fFScore: Number.POSITIVE_INFINITY,
                                bFScore: tGScore + this.heuristic(neighborNG.coordinates, searchTarget),
                                next: cameFrom,
                                fIndex: -1,
                                bIndex: -1
                            });
                        }
                        neighbor = pool.get(neighborId);
                    }
                    //this.logger.debug("(%s) Shorter path found for %s with gScore %s",
                    //    this.searchLabel(forward), neighborId, tGScore);

                    // Add or update node's position in the corresponding queue
                    const index = forward ? neighbor.fIndex : neighbor.bIndex;
                    if (index < 0) {
                        // Add to the queue
                        queue.push(neighbor);
                        //this.logger.debug("(%s) Queued %s with fScore %s: %O",
                        //    this.searchLabel(forward), neighborId, forward ? neighbor.fFScore : neighbor.bFScore, neighbor);
                    } else {
                        // Update on the queue
                        queue.updateItem(index);
                        //this.logger.debug("(%s) Updated (had index %s) %s in queue with fScore %s: %O",
                        //    this.searchLabel(forward), index, neighborId, forward ? neighbor.fFScore : neighbor.bFScore, neighbor);
                    }

                    // Check if this is a meeting point.
                    // This check is different than in the original algorithm 
                    // because here we are dealing with costs in the nodes
                    // instead of in the edges of the graph.
                    if (neighbor.next && neighbor.previous) {
                        // This is a meeting point!
                        const pathCost = this.calculatePathCost(neighbor);
                        if (pathCost < this.L) {
                            // And it is a shorter one
                            this.M = neighbor;
                            this.L = pathCost;
                            //this.logger.debug("(%s) Meeting point found with lower pathCost = %s at: %O",
                            //    this.searchLabel(forward), pathCost, neighbor);
                        }
                    }
                }
            }
        }

        // Update reference F scores
        if (forward) {
            if (queue.length > 0) {
                // this will be used in backward search
                this.fFScore = queue.peek().fFScore;
            }
        } else {
            if (queue.length > 0) {
                // this will be used in forward search
                this.bFScore = queue.peek().bFScore;
            }
        }
    }

    calculatePathCost(meetingPoint) {
        let cost = this.distance(this.NG.get(meetingPoint.id));
        let previous = meetingPoint.previous;
        while (previous) {
            cost += this.distance(this.NG.get(previous.id));
            previous = previous.previous;
        }
        let next = meetingPoint.next;
        while (next) {
            cost += this.distance(this.NG.get(next.id));
            next = next.next;
        }
        return cost;
    }

    rebuildPath() {
        const path = [Object.assign({}, this.NG.get(this.M.id))];

        // Rebuild forward path
        let previous = this.M.previous;
        while (previous) {
            path.unshift(Object.assign({}, this.NG.get(previous.id)));
            previous = previous.previous;
        }

        // Rebuild backward path
        let next = this.M.next;
        while (next) {
            path.push(Object.assign({}, this.NG.get(next.id)));
            next = next.next;
        }

        // Calculated elapsed time
        this.metadata.executionTime = new Date() - this.metadata.executionTime;
        // Clean up and calculate total path cost
        path.forEach(n => {
            delete n.nextNodes;
            delete n.prevNodes;
            this.metadata.cost += this.distance(n);
        });

        return { path, metadata: this.metadata };
    }

    searchLabel(forward) {
        return forward ? "FORWARD" : "BACKWARD"
    }

    get fFScore() {
        return this._fFScore;
    }

    set fFScore(score) {
        this._fFScore = score;
    }

    get bFScore() {
        return this._bFScore;
    }

    set bFScore(score) {
        this._bFScore = score;
    }

    get L() {
        return this._L;
    }

    set L(l) {
        this._L = l;
    }

    get M() {
        return this._M;
    }

    set M(m) {
        this._M = m
    }
}