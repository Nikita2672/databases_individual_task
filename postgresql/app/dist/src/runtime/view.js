"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewNode = viewNode;
exports.viewPrimitiveNode = viewPrimitiveNode;
exports.viewRefNode = viewRefNode;
exports.viewObjectNode = viewObjectNode;
exports.viewSetNode = viewSetNode;
exports.viewArrayNode = viewArrayNode;
const register_1 = require("../crdt/register");
const set_1 = require("../crdt/set");
const array_1 = require("../crdt/array");
const state_1 = require("../crdt/state");
const leafUtils_1 = require("./leafUtils");
const object_1 = require("../crdt/object");
function viewNode(node) {
    if ((0, state_1.isPrimitiveNodeState)(node)) {
        return viewPrimitiveNode(node);
    }
    if ((0, state_1.isRefNodeState)(node)) {
        return viewRefNode(node);
    }
    if ((0, state_1.isObjectNodeState)(node)) {
        return viewObjectNode(node);
    }
    if ((0, state_1.isSetNodeState)(node)) {
        return viewSetNode(node);
    }
    if ((0, state_1.isArrayNodeState)(node)) {
        return viewArrayNode(node);
    }
    throw new Error(`Unsupported node kind in view`);
}
function viewPrimitiveNode(node) {
    const view = (0, register_1.getRegisterView)(node.state);
    if (view.semantics === "lww") {
        return view.winner?.value ?? null;
    }
    return {
        kind: "mv",
        values: view.values.map((item) => item.value),
    };
}
function viewRefNode(node) {
    const view = (0, register_1.getRegisterView)(node.state);
    if (view.semantics === "lww") {
        return view.winner?.value ?? null;
    }
    return {
        kind: "mv",
        values: view.values.map((item) => item.value),
    };
}
function viewObjectNode(node) {
    const result = {};
    for (const field of (0, object_1.listObjectFields)(node.state)) {
        const slot = (0, object_1.getObjectField)(node.state, field);
        if (slot?.node !== null && slot?.node !== undefined) {
            result[field] = viewNode(slot.node);
        }
    }
    return result;
}
function viewSetNode(node) {
    const values = (0, set_1.getPresentSetValues)(node.state, { equals: leafUtils_1.areLeafValuesEqual });
    return values.map((item) => item.value);
}
function viewArrayNode(node) {
    const elements = (0, array_1.getVisibleArrayElements)(node.state);
    const result = [];
    for (const element of elements) {
        if (element.node !== null) {
            result.push(viewNode(element.node));
        }
    }
    return result;
}
