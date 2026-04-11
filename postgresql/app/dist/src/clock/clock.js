"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClockRelation = void 0;
exports.getClockValue = getClockValue;
exports.setClockValue = setClockValue;
exports.mergeClocks = mergeClocks;
exports.compareClocks = compareClocks;
exports.createClockState = createClockState;
exports.issueClock = issueClock;
exports.observeClock = observeClock;
var ClockRelation;
(function (ClockRelation) {
    ClockRelation[ClockRelation["EQUAL"] = 0] = "EQUAL";
    ClockRelation[ClockRelation["BEFORE"] = 1] = "BEFORE";
    ClockRelation[ClockRelation["AFTER"] = 2] = "AFTER";
    ClockRelation[ClockRelation["CONCURRENT"] = 3] = "CONCURRENT";
})(ClockRelation || (exports.ClockRelation = ClockRelation = {}));
function getClockValue(clock, replicaId) {
    return clock[replicaId] ?? 0;
}
function setClockValue(clock, replicaId, value) {
    return {
        ...clock,
        [replicaId]: value,
    };
}
function mergeClocks(a, b) {
    const replicaIds = new Set([
        ...Object.keys(a),
        ...Object.keys(b),
    ]);
    const merged = {};
    for (const replicaId of replicaIds) {
        merged[replicaId] = Math.max(getClockValue(a, replicaId), getClockValue(b, replicaId));
    }
    return merged;
}
function compareClocks(a, b) {
    const replicaIds = new Set([
        ...Object.keys(a),
        ...Object.keys(b),
    ]);
    let aLess = false;
    let aGreater = false;
    for (const replicaId of replicaIds) {
        const aValue = getClockValue(a, replicaId);
        const bValue = getClockValue(b, replicaId);
        if (aValue < bValue) {
            aLess = true;
        }
        else if (aValue > bValue) {
            aGreater = true;
        }
    }
    if (!aLess && !aGreater) {
        return ClockRelation.EQUAL;
    }
    if (aLess && !aGreater) {
        return ClockRelation.BEFORE;
    }
    if (!aLess && aGreater) {
        return ClockRelation.AFTER;
    }
    return ClockRelation.CONCURRENT;
}
function createClockState(replicaId) {
    return {
        replicaId,
        clock: {},
        counter: 0,
    };
}
function issueClock(state) {
    const nextCounter = state.counter + 1;
    const nextClock = {
        ...state.clock,
        [state.replicaId]: nextCounter,
    };
    return {
        state: {
            replicaId: state.replicaId,
            clock: nextClock,
            counter: nextCounter,
        }
    };
}
function observeClock(state, observed) {
    const merged = mergeClocks(state.clock, observed);
    const localCounter = Math.max(state.counter, getClockValue(merged, state.replicaId));
    return {
        replicaId: state.replicaId,
        clock: merged,
        counter: localCounter,
    };
}
