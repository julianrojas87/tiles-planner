import Utils from "../utils/Utils.js";
import { AStar } from "./AStar.js";

export class Dijkstra extends AStar {
    constructor(props) {
        super(props);
        this._heuristic = Utils.defaultHeuristic;
    }
}