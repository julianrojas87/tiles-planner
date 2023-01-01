import fs from "fs";

const map = new Map();
const file = JSON.parse(fs.readFileSync("/home/julian/Desktop/sparql_2023-01-01_13-32-39Z.json", "utf8"));

for(const obj of file.results.bindings) {
    map.set(obj.id.value, { id: obj.id.value, label: obj.label.value, wkt: obj.wkt.value });
}

fs.writeFileSync("/home/julian/Desktop/era_index.json", JSON.stringify([...map]), "utf8");