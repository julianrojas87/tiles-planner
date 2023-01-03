import { test } from "tap";
import { NetworkGraph } from "../lib/model/NetworkGraph.js";

/**
 * Test graph:
 * <A> -----> <B> -----> <C>
 *             |
 *             --------> <D>
 */

test("Build NetworkGraph", async t => {
    const NG = new NetworkGraph();
    // Add nodes and implicit edges to the graph
    NG.setNode({ id: "A", nextNode: "B" });
    NG.setNode({ id: "B", nextNode: "C" });
    NG.setNode({ id: "B", nextNode: "D" });

    t.ok(NG.get("A").nextNodes.has("B"));
    t.ok(NG.get("B").prevNodes.has("A"));
    t.equal(NG.get("B").nextNodes.size, 2);
    t.ok(NG.get("C").prevNodes.has("B"));
    t.ok(NG.get("D").prevNodes.has("B"));
});
