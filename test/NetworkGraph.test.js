import { test } from "tap";
import { NetworkGraph } from "../lib/index.js";

/**
 * Test graph:
 *  -----------------------
 *  |        (3,1)        ↓	       (9,1)
 * <A> -----➔ <B> -----➔ <C> ←----➔ <E>
 *(1,1)        |        (6,1)        ↑
 *             --------➔ <D> ---------
 *                      (6,0)
 * NODE weight costs:
 * <A>: 1 
 * <B>: 5
 * <C>: 10
 * <D>: 5
 * <E>: 4
 */

export function buildTestGraph(nodeWeighted) {
    const NG = new NetworkGraph();
    // Add nodes costs, coordinates and implicit edges to the graph
    NG.setNode({ id: "A", nextNode: "B", coordinates: [1, 1] });
    NG.setNode({ id: "A", nextNode: "C" });
    NG.setNode({ id: "B", nextNode: "C", coordinates: [3, 1] });
    NG.setNode({ id: "B", nextNode: "D" });
    NG.setNode({ id: "C", nextNode: "E", long: 6 });
    NG.setNode({ id: "C", lat: 1 });
    NG.setNode({ id: "D", nextNode: "E", coordinates: [6, 0] });
    NG.setNode({ id: "E", nextNode: "C", coordinates: [9, 1] });

    if (nodeWeighted) {
        NG.setNode({ id: "A", cost: 1 });
        NG.setNode({ id: "B", cost: 5 });
        NG.setNode({ id: "C", cost: 10 });
        NG.setNode({ id: "D", cost: 5 });
        NG.setNode({ id: "E", cost: 4 });
    }

    return NG;
}

test("Build NetworkGraph", async t => {
    const NG = buildTestGraph(true);
    t.ok(NG.get("A").nextNodes.has("B"));
    t.ok(NG.get("B").prevNodes.has("A"));
    t.equal(NG.get("B").nextNodes.size, 2);
    t.ok(NG.get("C").prevNodes.has("B"));
    t.ok(NG.get("D").prevNodes.has("B"));
});
