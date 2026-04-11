"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createObjectHistory = createObjectHistory;
exports.createReplicaState = createReplicaState;
exports.getObjectHistory = getObjectHistory;
exports.appendOperation = appendOperation;
exports.appendOperations = appendOperations;
exports.appendTransaction = appendTransaction;
exports.mergeObjectHistories = mergeObjectHistories;
exports.mergeReplicaStates = mergeReplicaStates;
exports.materializeReplicaObject = materializeReplicaObject;
exports.issueReplicaOperation = issueReplicaOperation;
exports.applyLocalAction = applyLocalAction;
exports.issueTransaction = issueTransaction;
exports.applyLocalTransaction = applyLocalTransaction;
const clock_1 = require("../clock/clock");
const operation_1 = require("../ops/operation");
const transaction_1 = require("../ops/transaction");
const materializer_1 = require("./materializer");
function createObjectHistory(objectId, operations = []) {
    return {
        objectId,
        operations: (0, operation_1.sortOperations)((0, operation_1.deduplicateOperations)(operations)),
    };
}
function createReplicaState(replicaId) {
    return {
        replicaId,
        clockState: (0, clock_1.createClockState)(replicaId),
        objects: {},
    };
}
function getObjectHistory(replica, objectId) {
    return replica.objects[objectId] ?? null;
}
function appendOperation(replica, operation) {
    const existingHistory = getObjectHistory(replica, operation.objectId) ??
        createObjectHistory(operation.objectId);
    const nextHistory = createObjectHistory(operation.objectId, [...existingHistory.operations, operation]);
    return {
        ...replica,
        clockState: (0, clock_1.observeClock)(replica.clockState, operation.clock),
        objects: {
            ...replica.objects,
            [operation.objectId]: nextHistory,
        },
    };
}
function appendOperations(replica, operations) {
    let next = replica;
    for (const operation of operations) {
        next = appendOperation(next, operation);
    }
    return next;
}
function appendTransaction(replica, transaction) {
    return appendOperations(replica, transaction.operations);
}
function mergeObjectHistories(left, right, objectId) {
    const leftOps = left?.operations ?? [];
    const rightOps = right?.operations ?? [];
    return createObjectHistory(objectId, [...leftOps, ...rightOps]);
}
function mergeReplicaStates(left, right, replicaId = left.replicaId) {
    const objectIds = new Set([
        ...Object.keys(left.objects),
        ...Object.keys(right.objects),
    ]);
    const objects = {};
    for (const objectId of objectIds) {
        objects[objectId] = mergeObjectHistories(left.objects[objectId] ?? null, right.objects[objectId] ?? null, objectId);
    }
    const mergedClock = (0, clock_1.mergeClocks)(left.clockState.clock, right.clockState.clock);
    const mergedCounter = Math.max((0, clock_1.getClockValue)(mergedClock, replicaId), left.replicaId === replicaId ? left.clockState.counter : 0, right.replicaId === replicaId ? right.clockState.counter : 0);
    return {
        replicaId,
        clockState: {
            replicaId,
            clock: mergedClock,
            counter: mergedCounter,
        },
        objects,
    };
}
function materializeReplicaObject(replica, objectId, options) {
    const history = getObjectHistory(replica, objectId) ??
        createObjectHistory(objectId);
    return (0, materializer_1.materializeObjectHistory)(history, options);
}
function issueReplicaOperation(replica, objectId, action, txId) {
    const issued = (0, clock_1.issueClock)(replica.clockState);
    const operation = {
        opId: `${replica.replicaId}:${issued.state.counter}`,
        txId: txId ?? `${replica.replicaId}:tx:${issued.state.counter}`,
        objectId,
        replicaId: replica.replicaId,
        clock: issued.state.clock,
        action,
    };
    return {
        replica: {
            ...replica,
            clockState: issued.state
        },
        operation,
    };
}
function applyLocalAction(replica, objectId, action, txId) {
    const issued = issueReplicaOperation(replica, objectId, action, txId);
    return appendOperation(issued.replica, issued.operation);
}
function issueTransaction(replica, objectId, build) {
    let workingReplica = replica;
    const txId = `${replica.replicaId}:tx:${replica.clockState.counter + 1}`;
    const builder = (0, transaction_1.createTransactionBuilder)(txId, objectId, {
        replicaId: replica.replicaId,
        issueOperationMetadata() {
            const issued = (0, clock_1.issueClock)(workingReplica.clockState);
            workingReplica = {
                ...workingReplica,
                clockState: issued.state,
            };
            return {
                opId: `${replica.replicaId}:${issued.state.counter}`,
                clock: issued.state.clock,
            };
        }
    });
    build(builder);
    return {
        replica: workingReplica,
        transaction: builder.toRecord(),
    };
}
function applyLocalTransaction(replica, objectId, build) {
    const issued = issueTransaction(replica, objectId, build);
    return appendTransaction(issued.replica, issued.transaction);
}
