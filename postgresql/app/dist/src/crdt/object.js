"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createObjectVersion = void 0;
exports.createObjectState = createObjectState;
exports.getObjectField = getObjectField;
exports.hasObjectField = hasObjectField;
exports.setObjectField = setObjectField;
exports.deleteObjectField = deleteObjectField;
exports.listObjectFields = listObjectFields;
const version_1 = require("./version");
exports.createObjectVersion = version_1.cloneVersionStamp;
function createObjectState() {
    return {
        items: {},
    };
}
function getObjectField(state, field) {
    return state.items[field] ?? null;
}
function hasObjectField(state, field) {
    const entry = getObjectField(state, field);
    return entry !== null && entry.node !== null;
}
function setObjectField(state, field, node, version) {
    return {
        items: {
            ...state.items,
            [field]: {
                node,
                version: (0, exports.createObjectVersion)(version),
            },
        },
    };
}
function deleteObjectField(state, field, version) {
    return {
        items: {
            ...state.items,
            [field]: {
                node: null,
                version: (0, exports.createObjectVersion)(version),
            },
        },
    };
}
function listObjectFields(state) {
    return Object.keys(state.items)
        .filter((field) => hasObjectField(state, field))
        .sort();
}
