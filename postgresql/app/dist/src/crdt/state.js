"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrimitiveNodeState = isPrimitiveNodeState;
exports.isRefNodeState = isRefNodeState;
exports.isObjectNodeState = isObjectNodeState;
exports.isSetNodeState = isSetNodeState;
exports.isArrayNodeState = isArrayNodeState;
exports.createPrimitiveNodeState = createPrimitiveNodeState;
exports.createRefNodeState = createRefNodeState;
exports.createObjectNodeState = createObjectNodeState;
exports.createSetNodeState = createSetNodeState;
exports.createArrayNodeState = createArrayNodeState;
const register_1 = require("./register");
const object_1 = require("./object");
const set_1 = require("./set");
const array_1 = require("./array");
function isPrimitiveNodeState(node) {
    return node.kind === "primitive";
}
function isRefNodeState(node) {
    return node.kind === "ref";
}
function isObjectNodeState(node) {
    return node.kind === "object";
}
function isSetNodeState(node) {
    return node.kind === "set";
}
function isArrayNodeState(node) {
    return node.kind === "array";
}
function createPrimitiveNodeState(semantics) {
    return {
        kind: "primitive",
        semantics,
        state: (0, register_1.createRegisterState)(semantics),
    };
}
function createRefNodeState(semantics) {
    return {
        kind: "ref",
        semantics,
        state: (0, register_1.createRegisterState)(semantics),
    };
}
function createObjectNodeState() {
    return {
        kind: "object",
        state: (0, object_1.createObjectState)(),
    };
}
function createSetNodeState() {
    return {
        kind: "set",
        state: (0, set_1.createSetState)(),
    };
}
function createArrayNodeState() {
    return {
        kind: "array",
        state: (0, array_1.createArrayState)(),
    };
}
