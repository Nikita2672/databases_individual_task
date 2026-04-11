"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSetState = createSetState;
exports.compareSetAddVersions = compareSetAddVersions;
exports.compareSetRemoveVersions = compareSetRemoveVersions;
exports.deduplicateSetAdds = deduplicateSetAdds;
exports.deduplicateSetRemoves = deduplicateSetRemoves;
exports.addSetValue = addSetValue;
exports.getObservedAddTagsForValue = getObservedAddTagsForValue;
exports.removeSetValue = removeSetValue;
exports.getRemovedTagsForValue = getRemovedTagsForValue;
exports.getLiveAdditionsForValue = getLiveAdditionsForValue;
exports.hasSetValue = hasSetValue;
exports.getPresentSetValues = getPresentSetValues;
function createSetState() {
    return {
        adds: [],
        removes: [],
    };
}
function compareSetAddVersions(a, b) {
    if (a.tag === b.tag) {
        return 0;
    }
    if (a.replicaId !== b.replicaId) {
        return a.replicaId < b.replicaId ? -1 : 1;
    }
    return a.tag < b.tag ? -1 : 1;
}
function compareSetRemoveVersions(a, b) {
    if (a.opId === b.opId) {
        return 0;
    }
    if (a.replicaId !== b.replicaId) {
        return a.replicaId < b.replicaId ? -1 : 1;
    }
    return a.opId < b.opId ? -1 : 1;
}
function deduplicateSetAdds(adds) {
    const byTag = new Map();
    for (const add of adds) {
        if (!byTag.has(add.tag)) {
            byTag.set(add.tag, add);
        }
    }
    return [...byTag.values()].sort(compareSetAddVersions);
}
function deduplicateSetRemoves(removes) {
    const byOpId = new Map();
    for (const remove of removes) {
        if (!byOpId.has(remove.opId)) {
            byOpId.set(remove.opId, remove);
        }
    }
    return [...byOpId.values()].sort(compareSetRemoveVersions);
}
function addSetValue(state, add) {
    return {
        adds: deduplicateSetAdds([...state.adds, add]),
        removes: state.removes,
    };
}
function getObservedAddTagsForValue(state, value, adapter) {
    const tags = [];
    for (const add of state.adds) {
        if (adapter.equals(add.value, value)) {
            tags.push(add.tag);
        }
    }
    return tags.sort();
}
function removeSetValue(state, input, adapter) {
    const removedTags = getObservedAddTagsForValue(state, input.value, adapter);
    const removeRecord = {
        value: input.value,
        opId: input.opId,
        replicaId: input.replicaId,
        clock: { ...input.clock },
        removedTags
    };
    return {
        adds: state.adds,
        removes: deduplicateSetRemoves([...state.removes, removeRecord]),
    };
}
function getRemovedTagsForValue(state, value, adapter) {
    const removed = new Set();
    for (const remove of state.removes) {
        if (!adapter.equals(remove.value, value)) {
            continue;
        }
        for (const tag of remove.removedTags) {
            removed.add(tag);
        }
    }
    return removed;
}
function getLiveAdditionsForValue(state, value, adapter) {
    const removedTags = getRemovedTagsForValue(state, value, adapter);
    return state.adds.filter((add) => adapter.equals(add.value, value) &&
        !removedTags.has(add.tag));
}
function hasSetValue(state, value, adapter) {
    return getLiveAdditionsForValue(state, value, adapter).length > 0;
}
function getPresentSetValues(state, adapter) {
    const views = [];
    for (const add of state.adds) {
        if (views.some((view) => adapter.equals(view.value, add.value))) {
            continue;
        }
        const liveAdds = getLiveAdditionsForValue(state, add.value, adapter);
        if (liveAdds.length === 0) {
            continue;
        }
        views.push({
            value: add.value,
            liveTags: liveAdds.map((item) => item.tag),
        });
    }
    return views;
}
