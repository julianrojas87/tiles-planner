import Utils from "../utils/Utils.js";
import { fetch as nodeFetch } from "undici";
import { Parser } from 'n3';
import { NetworkGraph } from "../model/NetworkGraph.js";

export class PathFinder {
    constructor(props) {
        this._NG = props.NG || new NetworkGraph();
        this._zoom = props.zoom;
        this._tilesBaseURL = props.tilesBaseURL;
        this._tileCache = props.tileCache || new Set();
        this._fetch = typeof fetch === "function" ? fetch : nodeFetch;
        this._logger = props.logger || Utils.getLogger("info");
    }

    async findPath() {}

    async fetchNodeTile(node) {
        if(node.coords) {
            const tilePath = `${this.zoom}/${Utils.longLat2Tile(node.coords, this.zoom)}`;
            
            // Skip if already fetched
            if(!this.tileCache.has(tilePath)) {
                this.logger.debug(`Fetching tile ${this.tilesBaseURL}/${tilePath}`);
                const tileURL = `${this.tilesBaseURL}/${tilePath}`;
                const res = await this.fetch(tileURL);
                // Register fetched tile in the cache
                this.tileCache.add(tilePath);

                // Parse and integrate response into local network graph
                if(res.headers.get("content-type").includes("application/n-triples")) {
                    const parser = new Parser({ format: "N-Triples" });
                    Utils.processRDFTile(parser.parse(await res.text()), this.NG);
                } else if(res.headers.get("content-type").includes("application/json")) {
                    throw new Error("Tile format not supported yet");
                }   
            }
        } else {
            throw new Error(`No geo coordinates found for ${node}`);
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

    get logger() {
        return this._logger;
    }

    set logger(logger) {
        this._logger = logger;
    }
}