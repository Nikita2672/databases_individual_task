"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareArrayElementVersions = exports.createArrayElementVersion = void 0;
exports.createArrayState = createArrayState;
exports.getArrayElement = getArrayElement;
exports.isArrayElementVisible = isArrayElementVisible;
exports.mergeArrayElementStates = mergeArrayElementStates;
exports.insertArrayElement = insertArrayElement;
exports.deleteArrayElement = deleteArrayElement;
exports.getVisibleArrayElements = getVisibleArrayElements;
exports.findVisibleElementIdAtIndex = findVisibleElementIdAtIndex;
const version_1 = require("./version");
exports.createArrayElementVersion = version_1.cloneVersionStamp;
exports.compareArrayElementVersions = version_1.compareVersionStamps;
function createArrayState() {
    return {
        elements: {},
    };
}
function getArrayElement(state, elementId) {
    return state.elements[elementId] ?? null;
}
function isArrayElementVisible(element) {
    return element.node !== null && element.deleteVersion === null;
}
function mergeArrayElementStates(left, right, adapter) {
    if (left === null) {
        return right;
    }
    if (right === null) {
        return left;
    }
    const insertWinner = (0, exports.compareArrayElementVersions)(left.insertVersion, right.insertVersion) >= 0
        ? left
        : right;
    let mergedNode;
    if (left.node !== null && right.node !== null) {
        mergedNode = adapter.mergeNodes(left.node, right.node);
    }
    else {
        mergedNode = left.node ?? right.node;
    }
    let mergedDeleteVersion = null;
    if (left.deleteVersion !== null && right.deleteVersion !== null) {
        mergedDeleteVersion =
            (0, exports.compareArrayElementVersions)(left.deleteVersion, right.deleteVersion) >= 0
                ? (0, exports.createArrayElementVersion)(left.deleteVersion)
                : (0, exports.createArrayElementVersion)(right.deleteVersion);
    }
    else if (left.deleteVersion !== null) {
        mergedDeleteVersion = (0, exports.createArrayElementVersion)(left.deleteVersion);
    }
    else if (right.deleteVersion !== null) {
        mergedDeleteVersion = (0, exports.createArrayElementVersion)(right.deleteVersion);
    }
    return {
        elementId: insertWinner.elementId,
        afterElementId: insertWinner.afterElementId,
        node: mergedNode,
        insertVersion: (0, exports.createArrayElementVersion)(insertWinner.insertVersion),
        deleteVersion: mergedDeleteVersion,
    };
}
function insertArrayElement(state, element, adapter) {
    const existing = state.elements[element.elementId] ?? null;
    const merged = mergeArrayElementStates(existing, element, adapter);
    if (merged === null) {
        return state;
    }
    return {
        elements: {
            ...state.elements,
            [element.elementId]: merged,
        },
    };
}
function deleteArrayElement(state, elementId, deleteVersion) {
    const existing = state.elements[elementId];
    if (!existing) {
        return state;
    }
    let nextDeleteVersion = (0, exports.createArrayElementVersion)(deleteVersion);
    if (existing.deleteVersion !== null &&
        (0, exports.compareArrayElementVersions)(existing.deleteVersion, nextDeleteVersion) > 0) {
        nextDeleteVersion = (0, exports.createArrayElementVersion)(existing.deleteVersion);
    }
    return {
        elements: {
            ...state.elements,
            [elementId]: {
                ...existing,
                node: null,
                deleteVersion: nextDeleteVersion,
            },
        },
    };
}
function buildChildrenIndex(state) {
    const byParent = new Map();
    for (const element of Object.values(state.elements)) {
        const parentId = element.afterElementId !== null &&
            state.elements[element.afterElementId] !== undefined
            ? element.afterElementId
            : null;
        const current = byParent.get(parentId) ?? [];
        current.push(element);
        byParent.set(parentId, current);
    }
    for (const children of byParent.values()) {
        children.sort((a, b) => (0, exports.compareArrayElementVersions)(a.insertVersion, b.insertVersion));
    }
    return byParent;
}
function getVisibleArrayElements(state) {
    const byParent = buildChildrenIndex(state);
    const result = [];
    const visited = new Set();
    function visit(parentId) {
        const children = byParent.get(parentId) ?? [];
        for (const child of children) {
            if (visited.has(child.elementId)) {
                continue;
            }
            visited.add(child.elementId);
            if (isArrayElementVisible(child)) {
                result.push(child);
            }
            visit(child.elementId);
        }
    }
    visit(null);
    return result;
}
function findVisibleElementIdAtIndex(state, index) {
    const visible = getVisibleArrayElements(state);
    if (index < 0 || index >= visible.length) {
        return null;
    }
    return visible[index].elementId;
}
