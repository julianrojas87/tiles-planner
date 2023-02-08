import { GSP, WGS, ERA } from "./Namespaces.js";
import { createLogger, format, transports } from "winston";
import { parse as wktParse } from 'wellknown';
import { point } from '@turf/helpers';
import distance from "@turf/distance";

function getLogger(level) {
    return createLogger({
        level,
        format: format.combine(
            format.splat(),
            format.simple()
        ),
        transports: [
            new transports.Console({
                format: format.combine(
                    format.colorize(),
                    format.simple()
                )
            })
        ]
    });
}

function isBrowser() {
    if(typeof process === 'object' && typeof window === 'undefined') {
        return false;
    }
    return true;
}

function isValidHttpUrl(string) {
    let url;

    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

function long2Tile(long, zoom) {
    return (Math.floor((long + 180) / 360 * Math.pow(2, zoom)));
}

function lat2Tile(lat, zoom) {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180)
        + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

function tile2long(x, z) {
    return (x / Math.pow(2, z) * 360 - 180);
}

function tile2lat(y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

function longLat2Tile(lngLat, z) {
    return `${long2Tile(lngLat[0], z)}/${lat2Tile(lngLat[1], z)}`;
}

function processRDFTile(quads, NG) {
    /**
     * Build Network Graph (NG) from RDF quads.
     * The NG is a data structure G = (V, E).
     * Temporarily hardcoded for ERA KG properties
     * where V are built from era:NetElement entities and
     * E are implicit on era:linkedTo properties.
     * 
     * TODO: Generalize to agnostic or configurable predicates.
    */
    for (const quad of quads) {
        if (quad.predicate.value === GSP.asWKT) {
            // Got node geo coordinates
            NG.setNode({
                id: quad.subject.value,
                coordinates: wktParse(quad.object.value).coordinates
            });
        } else if (quad.predicate.value === WGS.lat) {
            NG.setNode({
                id: quad.subject.value,
                lat: quad.object.value
            });
        } else if (quad.predicate.value === WGS.long) {
            NG.setNode({
                id: quad.subject.value,
                long: quad.object.value
            });
        } else if (quad.predicate.value === ERA.length) {
            NG.setNode({
                id: quad.subject.value,
                cost: quad.object.value
            });
        } else if (quad.predicate.value === ERA.linkedTo) {
            NG.setNode({
                id: quad.subject.value,
                nextNode: quad.object.value
            });
        }
    }
}

function defaultDistance() {
    return 1;
}

function defaultHeuristic() {
    return 0;
}

function harvesineDistance(a, b) {
    // Harvesine distance in meters
    return distance(point(a), point(b), { units: "meters" });
}

function euclideanDistance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
}

export default {
    getLogger,
    isBrowser,
    isValidHttpUrl,
    long2Tile,
    lat2Tile,
    tile2long,
    tile2lat,
    longLat2Tile,
    processRDFTile,
    defaultDistance,
    defaultHeuristic,
    harvesineDistance,
    euclideanDistance
};