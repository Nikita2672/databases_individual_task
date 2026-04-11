"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRefValue = isRefValue;
exports.createLeafNodeFromValue = createLeafNodeFromValue;
exports.areLeafValuesEqual = areLeafValuesEqual;
const state_1 = require("../crdt/state");
function isRefValue(value) {
    return (typeof value === "object" &&
        value !== null &&
        "type" in value &&
        value.type === "ref");
}
function createLeafNodeFromValue(value, context) {
    return isRefValue(value)
        ? (0, state_1.createRefNodeState)(context.policy.defaultRefSemantics)
        : (0, state_1.createPrimitiveNodeState)(context.policy.defaultPrimitiveSemantics);
}
function areLeafValuesEqual(left, right) {
    if (isRefValue(left) && isRefValue(right)) {
        return left.objectId === right.objectId;
    }
    if (isRefValue(left) || isRefValue(right)) {
        return false;
    }
    return left === right;
}
