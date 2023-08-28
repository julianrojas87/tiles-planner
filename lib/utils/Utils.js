import { GSP, WGS, RT } from "./Namespaces.js";
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
     * The NG is a data structure G = (V, E)
     * where V are entities with spatial location properties (gsp:asWKT or wgs:lat and wgs:long)
     * and E are represented implicitly with the http://w3id.org/routable-tiles/terms#linkedTo predicate.
     * 
     * An entity v ∈ V may optionally have an associated cost represented by
     * the http://w3id.org/routable-tiles/terms#cost predicate.
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
        } else if (quad.predicate.value === RT.cost) {
            NG.setNode({
                id: quad.subject.value,
                cost: quad.object.value
            });
        } else if (quad.predicate.value === RT.linkedTo) {
            NG.setNode({
                id: quad.subject.value,
                nextNode: quad.object.value
            });
        } else if (quad.predicate.value === RT.biLinkedTo) {
            NG.setNode({
                id: quad.subject.value,
                nextNode: quad.object.value
            });
            NG.setNode({
                id: quad.object.value,
                nextNode: quad.subject.value
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

function haversineDistance(a, b) {
    if (a.coordinates && b.coordinates) {
        // Harvesine distance in meters
        return distance(point(a.coordinates), point(b.coordinates), { units: "meters" });
    } else {
        console.warn("No coordinates found in nodes ", a, b);
        return 0;
    }
}

function euclideanDistance(a, b) {
    if (a.coordinates && b.coordinates) {
        const dx = a.coordinates[0] - b.coordinates[0];
        const dy = a.coordinates[1] - b.coordinates[1];
        return Math.sqrt(dx * dx + dy * dy);
    } else {
        console.warn("No coordinates found in nodes ", a, b);
        return 0;
    }
}

export default {
    getLogger,
    isValidHttpUrl,
    long2Tile,
    lat2Tile,
    tile2long,
    tile2lat,
    longLat2Tile,
    processRDFTile,
    defaultDistance,
    defaultHeuristic,
    haversineDistance,
    euclideanDistance
};