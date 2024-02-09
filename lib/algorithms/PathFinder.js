import { fetch as nodeFetch } from "undici";
import Utils from "../utils/Utils.js";
import { Parser } from 'n3';
import RBush from "rbush";
import { NetworkGraph } from "../model/NetworkGraph.js";

export class PathFinder {
    constructor(props) {
        this._NG = props.NG || new NetworkGraph();
        this._zoom = props.zoom;
        this._tilesBaseURL = props.tilesBaseURL;
        this._tileCache = props.tileCache || new Set();
        this._bypassServerCache = props.bypassServerCache || false;
        // Use native fetch or fallback to undici's fetch for older versions of Node
        this._fetch = !typeof fetch !== "undefined" ? fetch : nodeFetch;
        this._metadata = this.freshMetadata();
        this._killed = false;
        this._logger = props.logger || Utils.getLogger("info");
        // Tile quadtree index
        this._tileQuadTree = null;
    }

    async findPath() { }

    rebuildPath() { }

    freshMetadata() {
        return {
            // Amount of data transferred to solve this query
            byteCount: 0,
            // Number of tile requests done to solve this query
            requestCount: 0,
            // Number of server-side cache hits
            cacheHits: 0,
            // Number of main loop iterations needed to find a path
            dijkstraRank: 0,
            // Time it takes to find the shortest path
            executionTime: 0,
            // Total path cost measured in the units given by the distance function
            cost: 0
        }
    }
    async fetchNodeTile(node) {
        if (node) {
            if (node.coordinates) {
                // Get tile from quadtree index (if present) or with given zoom level 
                const tilePath = this.tileQuadTree ? this.getIndexedTile(node) 
                    : `${this.zoom}/${Utils.longLat2Tile(node.coordinates, this.zoom)}`;
                // Skip if already fetched
                if (!this.tileCache.has(tilePath)) {
                    this.logger.info(`${this.tilesBaseURL}/${tilePath}`);
                    const tileURL = `${this.tilesBaseURL}/${tilePath}${this.bypassServerCache ? "?nocache=true" : ""}`;
                    const res = await this.fetch(tileURL);
                    const data = await res.text();

                    // Register fetched tile in the cache
                    this.tileCache.add(tilePath);

                    // Register metadata
                    this.metadata.requestCount++;
                    this.metadata.byteCount += Buffer.byteLength(data);

                    // Parse and integrate response into local network graph
                    if (res.headers.get("content-type").includes("application/n-triples")) {
                        try {
                            const parser = new Parser({ format: "N-Triples" });
                            Utils.processRDFTile(parser.parse(data), this.NG);

                            // Check if server cache was hit
                            if (res.headers.get("X-Proxy-Cache") === "HIT") {
                                this.metadata.cacheHits++;
                            }
                        } catch (err) {
                            console.error(data);
                            console.error(tilePath)
                            throw err;
                        }
                    } else if (res.headers.get("content-type").includes("application/json")) {
                        throw new Error("Tile format not supported yet");
                    }
                }
            } else {
                throw new Error(`No coordinates found for ${node}`);
            }
        }
    }

    async loadTileQuadTree(threshold) {
        let indexURL = null;
        if (threshold) {
            indexURL = `${this.tilesBaseURL}/tile-index?threshold=${threshold}`;
        } else {
            indexURL = `${this.tilesBaseURL}/tile-index`;
        }

        // Request quad tree from tile interface
        const res = await this.fetch(indexURL);
        if (res.status === 200) {
            const quadTree = new RBush();
            quadTree.fromJSON(await res.json());

            this.tileQuadTree = quadTree;
            const all = quadTree.all();
            let total = 0;
            let tileCount = 0;

            all.forEach(t => { 
                if(t.count > 0) {
                    total += t.count;
                    tileCount++;
                } 
            });

            this.logger.info(`Tile quadtree index loaded with ${tileCount} indexed tiles and an average of ${total / tileCount} nodes/tile`);
        } else {
            this.logger.warn("No tile quad tree index available in tile interface");
        }
    }

    getIndexedTile(node) {
        return this.tileQuadTree.search({
            minX: node.coordinates[0],
            minY: node.coordinates[1],
            maxX: node.coordinates[0],
            maxY: node.coordinates[1]
        })[0].tile;
    }

    get NG() {
        return this._NG;
    }

    set NG(ng) {
        this._NG = ng;
    }

    get zoom() {
        return this._zoom;
    }

    set zoom(z) {
        this._zoom = z;
    }

    get tilesBaseURL() {
        return this._tilesBaseURL;
    }

    set tilesBaseURL(url) {
        this._tilesBaseURL = url;
    }

    get tileCache() {
        return this._tileCache;
    }

    set tileCache(cache) {
        this._tileCache = cache;
    }

    get tileQuadTree() {
        return this._tileQuadTree;
    }

    set tileQuadTree(tree) {
        this._tileQuadTree = tree;
    }

    get bypassServerCache() {
        return this._bypassServerCache;
    }

    get fetch() {
        return this._fetch;
    }

    get metadata() {
        return this._metadata;
    }

    set metadata(mobj) {
        this._metadata = mobj;
    }

    get killed() {
        return this._killed;
    }

    set killed(k) {
        this._killed = k;
    }

    get logger() {
        return this._logger;
    }

    set logger(logger) {
        this._logger = logger;
    }
}