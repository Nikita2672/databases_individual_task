"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareRegisterVersionsForLww = void 0;
exports.createRegisterState = createRegisterState;
exports.sortRegisterVersions = sortRegisterVersions;
exports.addRegisterVersion = addRegisterVersion;
exports.getLwwWinner = getLwwWinner;
exports.getMvValues = getMvValues;
exports.getRegisterView = getRegisterView;
const clock_1 = require("../clock/clock");
const version_1 = require("./version");
function createRegisterState(semantics) {
    return {
        semantics,
        versions: [],
    };
}
exports.compareRegisterVersionsForLww = version_1.compareVersionStamps;
function sortRegisterVersions(versions) {
    return [...versions].sort(exports.compareRegisterVersionsForLww);
}
function joinRegisterVersions(versions, incoming) {
    const next = [];
    let shouldInsertIncoming = true;
    for (const existing of versions) {
        if (existing.opId === incoming.opId) {
            next.push(existing);
            shouldInsertIncoming = false;
            continue;
        }
        const relation = (0, clock_1.compareClocks)(existing.clock, incoming.clock);
        if (relation === clock_1.ClockRelation.BEFORE) {
            continue;
        }
        if (relation === clock_1.ClockRelation.AFTER) {
            next.push(existing);
            shouldInsertIncoming = false;
            continue;
        }
        next.push(existing);
    }
    if (shouldInsertIncoming) {
        next.push(incoming);
    }
    return sortRegisterVersions(next);
}
function addRegisterVersion(state, version) {
    return {
        semantics: state.semantics,
        versions: joinRegisterVersions(state.versions, version),
    };
}
function getLwwWinner(state) {
    if (state.versions.length === 0) {
        return null;
    }
    let winner = state.versions[0];
    for (let i = 1; i < state.versions.length; i += 1) {
        const candidate = state.versions[i];
        if ((0, exports.compareRegisterVersionsForLww)(candidate, winner) > 0) {
            winner = candidate;
        }
    }
    return winner;
}
function getMvValues(state) {
    return sortRegisterVersions(state.versions);
}
function getRegisterView(state) {
    if (state.semantics === "lww") {
        return {
            semantics: "lww",
            winner: getLwwWinner(state),
        };
    }
    return {
        semantics: "mv",
        values: getMvValues(state),
    };
}
