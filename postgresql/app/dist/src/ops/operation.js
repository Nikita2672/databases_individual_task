"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareOperations = compareOperations;
exports.sortOperations = sortOperations;
exports.deduplicateOperations = deduplicateOperations;
const clock_1 = require("../clock/clock");
function parseOperationCounter(opId) {
    const parts = opId.split(":");
    const last = parts[parts.length - 1];
    if (!last) {
        return null;
    }
    const parsed = Number(last);
    return Number.isInteger(parsed) ? parsed : null;
}
function compareOperations(a, b) {
    if (a.opId === b.opId) {
        return 0;
    }
    const causal = (0, clock_1.compareClocks)(a.clock, b.clock);
    if (causal === clock_1.ClockRelation.BEFORE) {
        return -1;
    }
    if (causal === clock_1.ClockRelation.AFTER) {
        return 1;
    }
    if (a.replicaId !== b.replicaId) {
        // детерминированно выводим на основе лексикографического сравнения по replicaId
        return a.replicaId < b.replicaId ? -1 : 1;
    }
    const aCounter = parseOperationCounter(a.opId);
    const bCounter = parseOperationCounter(b.opId);
    if (aCounter !== null && bCounter !== null && aCounter !== bCounter) {
        return aCounter - bCounter;
    }
    return a.opId < b.opId ? -1 : 1;
}
function sortOperations(operations) {
    return [...operations].sort(compareOperations);
}
function deduplicateOperations(operations) {
    const unique = new Map();
    for (const operation of operations) {
        if (!unique.has(operation.opId)) {
            unique.set(operation.opId, operation);
        }
    }
    return sortOperations([...unique.values()]);
}
