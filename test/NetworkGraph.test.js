import { test } from "tap";
import { NetworkGraph } from "../lib/model/NetworkGraph.js";

/**
 * Test graph:
 *  -----------------------
 *  |        (3,1)        ↓	       (9,1)
 * <A> -----➔ <B> -----➔ <C> ←----➔ <E>
 *(1,1)        |        (6,1)        ↑
 *             --------➔ <D> ---------
 *                      (6,0)
 * NODE costs:
 * <A>: 1 
 * <B>: 5
 * <C>: 10
 * <D>: 5
 * <E>: 4
 */

export function buildTestGraph() {
    const NG = new NetworkGraph();
    // Add nodes costs, coordinates and implicit edges to the graph
    NG.setNode({ id: "A", nextNode: "B", cost: 1, coordinates: [1, 1] });
    NG.setNode({ id: "A", nextNode: "C" });
    NG.setNode({ id: "B", nextNode: "C", cost: 5, coordinates: [3, 1] });
    NG.setNode({ id: "B", nextNode: "D" });
    NG.setNode({ id: "C", nextNode: "E", cost: 10, long: 6 });
    NG.setNode({ id: "C", lat: 1 });
    NG.setNode({ id: "D", nextNode: "E", cost: 5, coordinates: [6, 0] });
    NG.setNode({ id: "E", nextNode: "C", cost: 4, coordinates: [9, 1] });

    return NG;
}

test("Build NetworkGraph", async t => {
    const NG = buildTestGraph();
    t.ok(NG.get("A").nextNodes.has("B"));
    t.ok(NG.get("B").prevNodes.has("A"));
    t.equal(NG.get("B").nextNodes.size, 2);
    t.ok(NG.get("C").prevNodes.has("B"));
    t.ok(NG.get("D").prevNodes.has("B"));
});
