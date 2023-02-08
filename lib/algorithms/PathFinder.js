import Utils from "../utils/Utils.js";
import { Parser } from 'n3';
import { NetworkGraph } from "../model/NetworkGraph.js";

export class PathFinder {
    constructor(props) {
        this._NG = props.NG || new NetworkGraph();
        this._zoom = props.zoom;
        this._tilesBaseURL = props.tilesBaseURL;
        this._tileCache = props.tileCache || new Set();
        // Use native fetch when running in the browser
        this._fetch = Utils.isBrowser() ? fetch : Utils.nodeFetch;
        this._metadata = this.freshMetadata();
        // TODO: adjust to also disable browser cache
        this._disableCache = props.disableCache || false;
        this._logger = props.logger || Utils.getLogger("info");
    }

    async findPath() { }
    rebuildPath() { }

    freshMetadata() {
        return {
            // Amount of data transferred to solve this query
            byteCount: 0,
            // Number of tile requests done to solve this query
            requestCount: 0,
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
                const tilePath = `${this.zoom}/${Utils.longLat2Tile(node.coordinates, this.zoom)}`;
                // Skip if already fetched
                if (this.disableCache || !this.tileCache.has(tilePath)) {
                    this.logger.info(`Fetching tile ${this.tilesBaseURL}/${tilePath}`);
                    const tileURL = `${this.tilesBaseURL}/${tilePath}`;
                    const res = await this.fetch(tileURL);
                    const data = await res.text();
                    
                    // Register fetched tile in the cache (if enabled)
                    if(!this.disableCache) this.tileCache.add(tilePath);

                    // Register metadata
                    this.metadata.requestCount++;
                    this.metadata.byteCount += Buffer.byteLength(data);


                    // Parse and integrate response into local network graph
                    if (res.headers.get("content-type").includes("application/n-triples")) {
                        try {
                            const parser = new Parser({ format: "N-Triples" });
                            Utils.processRDFTile(parser.parse(data), this.NG);
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

    get fetch() {
        return this._fetch;
    }

    get metadata() {
        return this._metadata;
    }

    set metadata(mobj) {
        this._metadata = mobj;
    }

    get disableCache() {
        return this._disableCache;
    }

    get logger() {
        return this._logger;
    }

    set logger(logger) {
        this._logger = logger;
    }
}