"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertStringPath = assertStringPath;
exports.splitParentPath = splitParentPath;
exports.getChildFromContainer = getChildFromContainer;
const state_1 = require("../crdt/state");
const object_1 = require("../crdt/object");
function assertStringPath(path) {
    for (const segment of path) {
        if (typeof segment !== "string") {
            throw new Error(`MVP apply.ts only supports string path segments for traversal. Got: ${String(segment)}`);
        }
    }
    return path;
}
function splitParentPath(path) {
    const normalized = assertStringPath(path);
    if (normalized.length === 0) {
        throw new Error("Path must not be empty");
    }
    return {
        parentPath: normalized.slice(0, -1),
        lastSegment: normalized[normalized.length - 1],
    };
}
function getChildFromContainer(container, segment) {
    if ((0, state_1.isObjectNodeState)(container)) {
        const entry = (0, object_1.getObjectField)(container.state, segment);
        return entry?.node ?? null;
    }
    throw new Error(`Cannot traverse through node kind "${container.kind}" using string segment "${segment}"`);
}
