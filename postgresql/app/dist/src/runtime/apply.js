"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyOperationToRoot = applyOperationToRoot;
exports.applyActionToRoot = applyActionToRoot;
exports.createRegisterVersionFromMetadata = createRegisterVersionFromMetadata;
exports.createVersionStampFromMetadata = createVersionStampFromMetadata;
exports.createContainerNode = createContainerNode;
const register_1 = require("../crdt/register");
const object_1 = require("../crdt/object");
const set_1 = require("../crdt/set");
const array_1 = require("../crdt/array");
const state_1 = require("../crdt/state");
const pathHelpers_1 = require("./pathHelpers");
const leafUtils_1 = require("./leafUtils");
function applyOperationToRoot(root, operation, context) {
    return applyActionToRoot(root, operation.action, {
        opId: operation.opId,
        replicaId: operation.replicaId,
        clock: operation.clock,
    }, context);
}
function applyActionToRoot(root, action, metadata, context) {
    switch (action.type) {
        case "field.set":
            return applyFieldSet(root, action, metadata, context);
        case "field.delete":
            return applyFieldDelete(root, action, metadata);
        case "set.add":
            return applySetAdd(root, action, metadata);
        case "set.remove":
            return applySetRemove(root, action, metadata);
        case "array.insert":
            return applyArrayInsert(root, action, metadata, context);
        case "array.remove":
            return applyArrayRemove(root, action, metadata);
        case "node.initObject":
            return applyNodeInit(root, action, "object", metadata);
        case "node.initSet":
            return applyNodeInit(root, action, "set", metadata);
        case "node.initArray":
            return applyNodeInit(root, action, "array", metadata);
        default: {
            throw new Error(`Unsupported action: ${JSON.stringify(action)}`);
        }
    }
}
/* ============================================================================
 * Value / version helpers
 * ========================================================================== */
function createRegisterVersionFromMetadata(value, metadata) {
    return {
        value,
        opId: metadata.opId,
        replicaId: metadata.replicaId,
        clock: { ...metadata.clock }
    };
}
function createVersionStampFromMetadata(metadata) {
    return {
        opId: metadata.opId,
        replicaId: metadata.replicaId,
        clock: { ...metadata.clock }
    };
}
function createContainerNode(kind) {
    switch (kind) {
        case "object":
            return (0, state_1.createObjectNodeState)();
        case "set":
            return (0, state_1.createSetNodeState)();
        case "array":
            return (0, state_1.createArrayNodeState)();
    }
}
function replaceObjectChildWithoutSlotRewriteVersion(parent, field, child) {
    if (!(0, state_1.isObjectNodeState)(parent)) {
        throw new Error(`replaceObjectChildWithoutSlotRewriteVersion expects object node, got "${parent.kind}"`);
    }
    const existing = (0, object_1.getObjectField)(parent.state, field);
    if (existing === null) {
        if (child === null) {
            return parent;
        }
        return {
            kind: "object",
            state: {
                items: {
                    ...parent.state.items,
                    [field]: {
                        node: child,
                        version: null,
                    },
                },
            },
        };
    }
    return {
        kind: "object",
        state: {
            items: {
                ...parent.state.items,
                [field]: {
                    ...existing,
                    node: child,
                },
            },
        },
    };
}
function replaceChildInContainerWithoutRewriteVersion(container, segment, child) {
    if ((0, state_1.isObjectNodeState)(container)) {
        return replaceObjectChildWithoutSlotRewriteVersion(container, segment, child);
    }
    throw new Error(`Cannot technically rewrite child in node kind "${container.kind}"`);
}
/* ============================================================================
 * Recursive immutable rewrite
 * ========================================================================== */
function rewriteExistingNodeAtPath(node, path, rewriter) {
    const normalized = (0, pathHelpers_1.assertStringPath)(path);
    if (normalized.length === 0) {
        return rewriter(node);
    }
    const [head, ...tail] = normalized;
    const child = (0, pathHelpers_1.getChildFromContainer)(node, head);
    if (child === null) {
        throw new Error(`Path does not resolve to an existing node: ${normalized.join(".")}`);
    }
    const rewrittenChild = rewriteExistingNodeAtPath(child, tail, rewriter);
    return replaceChildInContainerWithoutRewriteVersion(node, head, rewrittenChild);
}
function rewriteSlotAtPath(root, path, metadata, rewriter) {
    const { parentPath, lastSegment } = (0, pathHelpers_1.splitParentPath)(path);
    if (parentPath.length === 0) {
        return rewriteChildSlotOnContainer(root, lastSegment, metadata, rewriter);
    }
    return rewriteExistingNodeAtPath(root, parentPath, (parent) => rewriteChildSlotOnContainer(parent, lastSegment, metadata, rewriter));
}
function rewriteChildSlotOnContainer(parent, segment, metadata, rewriter) {
    if (!(0, state_1.isObjectNodeState)(parent)) {
        throw new Error(`Parent path must resolve to object. Got "${parent.kind}"`);
    }
    const existing = (0, pathHelpers_1.getChildFromContainer)(parent, segment);
    const next = rewriter(existing);
    return {
        kind: "object",
        state: next !== null
            ? (0, object_1.setObjectField)(parent.state, segment, next, createVersionStampFromMetadata(metadata))
            : (0, object_1.deleteObjectField)(parent.state, segment, createVersionStampFromMetadata(metadata)),
    };
}
/* ============================================================================
 * Action application: field.set / field.delete / node.init*
 * ========================================================================== */
function applyFieldSet(root, action, metadata, context) {
    return rewriteSlotAtPath(root, action.path, metadata, (existing) => {
        const target = existing ?? (0, leafUtils_1.createLeafNodeFromValue)(action.value, context);
        if ((0, state_1.isPrimitiveNodeState)(target)) {
            if ((0, leafUtils_1.isRefValue)(action.value)) {
                throw new Error("Cannot write ref value into primitive register");
            }
            return {
                kind: "primitive",
                semantics: target.semantics,
                state: (0, register_1.addRegisterVersion)(target.state, createRegisterVersionFromMetadata(action.value, metadata)),
            };
        }
        if ((0, state_1.isRefNodeState)(target)) {
            if (!(0, leafUtils_1.isRefValue)(action.value)) {
                throw new Error("Cannot write primitive value into ref register");
            }
            return {
                kind: "ref",
                semantics: target.semantics,
                state: (0, register_1.addRegisterVersion)(target.state, createRegisterVersionFromMetadata(action.value, metadata)),
            };
        }
        throw new Error(`field.set can only target leaf register nodes, got "${target.kind}"`);
    });
}
function applyFieldDelete(root, action, metadata) {
    return rewriteSlotAtPath(root, action.path, metadata, () => null);
}
function applyNodeInit(root, action, kind, metadata) {
    return rewriteSlotAtPath(root, action.path, metadata, (existing) => {
        if (existing !== null) {
            if ((kind === "object" && (0, state_1.isObjectNodeState)(existing)) ||
                (kind === "set" && (0, state_1.isSetNodeState)(existing)) ||
                (kind === "array" && (0, state_1.isArrayNodeState)(existing))) {
                return existing;
            }
            throw new Error(`Cannot initialize ${kind} node at path "${action.path.join(".")}": ` +
                `slot already contains "${existing.kind}"`);
        }
        return createContainerNode(kind);
    });
}
/* ============================================================================
 * Action application: set.*
 * ========================================================================== */
function applySetAdd(root, action, metadata) {
    return rewriteExistingNodeAtPath(root, action.path, (target) => {
        if (!(0, state_1.isSetNodeState)(target)) {
            throw new Error(`set.add expects set node, got "${target.kind}"`);
        }
        const addVersion = {
            value: action.value,
            tag: metadata.opId,
            replicaId: metadata.replicaId,
            clock: { ...metadata.clock }
        };
        return {
            kind: "set",
            state: (0, set_1.addSetValue)(target.state, addVersion),
        };
    });
}
function applySetRemove(root, action, metadata) {
    return rewriteExistingNodeAtPath(root, action.path, (target) => {
        if (!(0, state_1.isSetNodeState)(target)) {
            throw new Error(`set.remove expects set node, got "${target.kind}"`);
        }
        const removeInput = {
            value: action.value,
            opId: metadata.opId,
            replicaId: metadata.replicaId,
            clock: { ...metadata.clock }
        };
        return {
            kind: "set",
            state: (0, set_1.removeSetValue)(target.state, removeInput, {
                equals: leafUtils_1.areLeafValuesEqual,
            })
        };
    });
}
/* ============================================================================
 * Action application: array.*
 * ========================================================================== */
function applyArrayInsert(root, action, metadata, context) {
    return rewriteExistingNodeAtPath(root, action.path, (target) => {
        if (!(0, state_1.isArrayNodeState)(target)) {
            throw new Error(`array.insert expects array node, got "${target.kind}"`);
        }
        const visibleBefore = action.index - 1;
        const afterElementId = visibleBefore >= 0
            ? (0, array_1.findVisibleElementIdAtIndex)(target.state, visibleBefore)
            : null;
        if (action.index > 0 && afterElementId === null) {
            throw new Error(`Cannot insert array element at index ${action.index}: index is out of bounds`);
        }
        const child = (0, leafUtils_1.createLeafNodeFromValue)(action.value, context);
        let initializedChild;
        if ((0, state_1.isPrimitiveNodeState)(child)) {
            if ((0, leafUtils_1.isRefValue)(action.value)) {
                throw new Error("Cannot insert ref value into primitive register");
            }
            initializedChild = {
                kind: "primitive",
                semantics: child.semantics,
                state: (0, register_1.addRegisterVersion)(child.state, createRegisterVersionFromMetadata(action.value, metadata)),
            };
        }
        else if ((0, state_1.isRefNodeState)(child)) {
            if (!(0, leafUtils_1.isRefValue)(action.value)) {
                throw new Error("Cannot insert primitive value into ref register");
            }
            initializedChild = {
                kind: "ref",
                semantics: child.semantics,
                state: (0, register_1.addRegisterVersion)(child.state, createRegisterVersionFromMetadata(action.value, metadata)),
            };
        }
        else {
            throw new Error("Array MVP insert currently supports only leaf values");
        }
        const element = {
            elementId: metadata.opId,
            afterElementId,
            node: initializedChild,
            insertVersion: createVersionStampFromMetadata(metadata),
            deleteVersion: null,
        };
        return {
            kind: "array",
            state: (0, array_1.insertArrayElement)(target.state, element, {
                mergeNodes: (_left, _right) => {
                    throw new Error(`Unexpected duplicate array element id during local apply: ${metadata.opId}`);
                },
            }),
        };
    });
}
function applyArrayRemove(root, action, metadata) {
    return rewriteExistingNodeAtPath(root, action.path, (target) => {
        if (!(0, state_1.isArrayNodeState)(target)) {
            throw new Error(`array.remove expects array node, got "${target.kind}"`);
        }
        const elementId = (0, array_1.findVisibleElementIdAtIndex)(target.state, action.index);
        if (elementId === null) {
            throw new Error(`Cannot remove array element at index ${action.index}: index is out of bounds`);
        }
        return {
            kind: "array",
            state: (0, array_1.deleteArrayElement)(target.state, elementId, createVersionStampFromMetadata(metadata)),
        };
    });
}
