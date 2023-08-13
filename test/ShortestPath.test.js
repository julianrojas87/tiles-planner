import { test } from "tap";
import { buildTestGraph } from "./NetworkGraph.test.js";
import { Dijkstra, AStar, NBAStar } from "../lib/index.js";
import Utils from "../lib/utils/Utils.js";

const NG_node_weighted = buildTestGraph(true);

test("Test Dijkstra rank limit functionality (node-weighted graph)", async t => {
    const planner = new Dijkstra({
        NG: NG_node_weighted,
        zoom: 10,
        tilesBaseURL: "http://example.org",
        distance: (node) => { return node.cost }
    });

    const path = (await planner.findPath(
        { id: "A", coordinates: [1, 1] },
        undefined,
        4
    )).path;
    
    t.equal(path.map(n => n.id).join(""), "ABD");
});

test("Test Dijkstra implementation (node-weighted graph)", async t => {
    const planner = new Dijkstra({
        NG: NG_node_weighted,
        zoom: 10,
        tilesBaseURL: "http://example.org",
        distance: (node) => { return node.cost }
    });

    const path = await planner.findPath(
        { id: "A", coordinates: [1, 1] },
        { id: "E", coordinates: [9, 1] }
    );

    t.equal(path.path.map(n => n.id).join(""), "ACE");
    // It takes Dijkstra 5 iterations to find the path
    t.equal(path.metadata.dijkstraRank, 5);
});

test("Test A* implementation (node-weighted graph)", async t => {
    const planner = new AStar({
        NG: NG_node_weighted,
        zoom: 10,
        tilesBaseURL: "http://example.org",
        distance: (node) => { return node.cost },
        heuristic: Utils.harvesineDistance
    });

    const path = await planner.findPath(
        { id: "A", coordinates: [1, 1] },
        { id: "E", coordinates: [9, 1] }
    );

    t.equal(path.path.map(n => n.id).join(""), "ACE");
    // It takes A* 3 iterations to find the path
    t.equal(path.metadata.dijkstraRank, 3);
});

test("Test NBA* implementation (node-weighted graph)", async t => {
    const planner = new NBAStar({
        NG: NG_node_weighted,
        zoom: 10,
        tilesBaseURL: "http://example.org",
        distance: (node) => { return node.cost },
        heuristic: Utils.euclideanDistance
    });

    const path = await planner.findPath(
        { id: "A", coordinates: [1, 1] },
        { id: "E", coordinates: [9, 1] }
    );
    
    t.equal(path.path.map(n => n.id).join(""), "ACE");
});

const NG_edge_weighted = buildTestGraph(false);

test("Test Dijkstra rank limit functionality (edge-weighted graph)", async t => {
    const planner = new Dijkstra({
        NG: NG_edge_weighted,
        zoom: 10,
        tilesBaseURL: "http://example.org",
        distance: Utils.euclideanDistance
    });

    const path = (await planner.findPath(
        { id: "A", coordinates: [1, 1] },
        undefined,
        4
    )).path;
    
    t.equal(path.map(n => n.id).join(""), "ABD");
});

test("Test Dijkstra implementation (edge-weighted graph)", async t => {
    const planner = new Dijkstra({
        NG: NG_edge_weighted,
        zoom: 10,
        tilesBaseURL: "http://example.org",
        distance: Utils.euclideanDistance
    });

    const path = await planner.findPath(
        { id: "A", coordinates: [1, 1] },
        { id: "E", coordinates: [9, 1] }
    );

    t.equal(path.path.map(n => n.id).join(""), "ACE");
    // It takes Dijkstra 5 iterations to find the path
    t.equal(path.metadata.dijkstraRank, 5);
});

test("Test A* implementation (edge-weighted graph)", async t => {
    const planner = new AStar({
        NG: NG_edge_weighted,
        zoom: 10,
        tilesBaseURL: "http://example.org",
        distance: Utils.euclideanDistance,
        heuristic: Utils.harvesineDistance
    });

    const path = await planner.findPath(
        { id: "A", coordinates: [1, 1] },
        { id: "E", coordinates: [9, 1] }
    );

    t.equal(path.path.map(n => n.id).join(""), "ACE");
    // It takes A* 3 iterations to find the path
    t.equal(path.metadata.dijkstraRank, 3);
});

test("Test NBA* implementation (edge-weighted graph)", async t => {
    const planner = new NBAStar({
        NG: NG_edge_weighted,
        zoom: 10,
        tilesBaseURL: "http://example.org",
        distance: Utils.euclideanDistance,
        heuristic: Utils.euclideanDistance
    });

    const path = await planner.findPath(
        { id: "A", coordinates: [1, 1] },
        { id: "E", coordinates: [9, 1] }
    );
    
    t.equal(path.path.map(n => n.id).join(""), "ACE");
});