"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterOperationsByObjectId = filterOperationsByObjectId;
exports.normalizeOperationsForObject = normalizeOperationsForObject;
exports.flattenTransactionHistory = flattenTransactionHistory;
exports.materializeOperations = materializeOperations;
exports.materializeObjectHistory = materializeObjectHistory;
exports.materializeTransactionHistory = materializeTransactionHistory;
const operation_1 = require("../ops/operation");
const state_1 = require("../crdt/state");
const apply_1 = require("./apply");
function filterOperationsByObjectId(operations, objectId) {
    return operations.filter((operation) => operation.objectId === objectId);
}
function normalizeOperationsForObject(operations, objectId) {
    const filtered = filterOperationsByObjectId(operations, objectId);
    const deduplicated = (0, operation_1.deduplicateOperations)(filtered);
    return (0, operation_1.sortOperations)(deduplicated);
}
function flattenTransactionHistory(history) {
    const operations = [];
    for (const transaction of history.transactions) {
        for (const operation of transaction.operations) {
            operations.push(operation);
        }
    }
    return operations;
}
function materializeOperations(objectId, operations, options) {
    const normalized = normalizeOperationsForObject(operations, objectId);
    let root = options.initialRoot ?? (0, state_1.createObjectNodeState)();
    for (const operation of normalized) {
        root = (0, apply_1.applyOperationToRoot)(root, operation, options.applyContext);
    }
    return {
        objectId,
        root,
        operations: normalized,
    };
}
function materializeObjectHistory(history, options) {
    return materializeOperations(history.objectId, history.operations, options);
}
function materializeTransactionHistory(history, options) {
    return materializeOperations(history.objectId, flattenTransactionHistory(history), options);
}
