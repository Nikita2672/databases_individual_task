"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransactionBuilder = createTransactionBuilder;
class DefaultTransactionBuilder {
    txId;
    objectId;
    replicaId;
    operations = [];
    context;
    constructor(txId, objectId, context) {
        this.txId = txId;
        this.objectId = objectId;
        this.replicaId = context.replicaId;
        this.context = context;
    }
    emit(action) {
        const issued = this.context.issueOperationMetadata();
        const operation = {
            opId: issued.opId,
            txId: this.txId,
            objectId: this.objectId,
            replicaId: this.replicaId,
            clock: { ...issued.clock },
            action,
        };
        this.operations.push(operation);
    }
    initObject(path) {
        this.emit({
            type: "node.initObject",
            path,
        });
    }
    initSet(path) {
        this.emit({
            type: "node.initSet",
            path,
        });
    }
    initArray(path) {
        this.emit({
            type: "node.initArray",
            path,
        });
    }
    setField(path, value) {
        this.emit({
            type: "field.set",
            path,
            value,
        });
    }
    deleteField(path) {
        this.emit({
            type: "field.delete",
            path,
        });
    }
    setAdd(path, value) {
        this.emit({
            type: "set.add",
            path,
            value,
        });
    }
    setRemove(path, value) {
        this.emit({
            type: "set.remove",
            path,
            value,
        });
    }
    arrayInsert(path, index, value) {
        this.emit({
            type: "array.insert",
            path,
            index,
            value,
        });
    }
    arrayRemove(path, index) {
        this.emit({
            type: "array.remove",
            path,
            index,
        });
    }
    getOperations() {
        return [...this.operations];
    }
    toRecord() {
        return {
            txId: this.txId,
            objectId: this.objectId,
            replicaId: this.replicaId,
            operations: [...this.operations],
        };
    }
}
function createTransactionBuilder(txId, objectId, context) {
    return new DefaultTransactionBuilder(txId, objectId, context);
}
