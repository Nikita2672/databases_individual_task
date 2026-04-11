"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneVersionStamp = cloneVersionStamp;
exports.compareVersionStamps = compareVersionStamps;
const clock_1 = require("../clock/clock");
function cloneVersionStamp(input) {
    return {
        ...input,
        clock: { ...input.clock },
    };
}
function compareVersionStamps(a, b) {
    if (a.opId === b.opId) {
        return 0;
    }
    const relation = (0, clock_1.compareClocks)(a.clock, b.clock);
    if (relation === clock_1.ClockRelation.BEFORE) {
        return -1;
    }
    if (relation === clock_1.ClockRelation.AFTER) {
        return 1;
    }
    if (a.replicaId !== b.replicaId) {
        return a.replicaId < b.replicaId ? -1 : 1;
    }
    return a.opId < b.opId ? -1 : 1;
}
