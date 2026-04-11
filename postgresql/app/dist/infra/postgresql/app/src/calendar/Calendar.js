import { createArrayNodeState, createObjectNodeState, createPrimitiveNodeState, createRefNodeState, createSetNodeState, } from "@gvsem/epistyl/src/crdt/state";
import { applyLocalAction, createReplicaState, materializeReplicaObject, mergeReplicaStates, } from "@gvsem/epistyl/src/runtime/replica";
import { viewNode } from "@gvsem/epistyl/src/runtime/view";
export function createCalendarInitialRoot() {
    const locationNode = createObjectNodeState();
    locationNode.state.items["room"] = {
        node: createPrimitiveNodeState("lww"),
        version: null,
    };
    locationNode.state.items["building"] = {
        node: createPrimitiveNodeState("lww"),
        version: null,
    };
    const metadataNode = createObjectNodeState();
    metadataNode.state.items["color"] = {
        node: createPrimitiveNodeState("lww"),
        version: null,
    };
    metadataNode.state.items["note"] = {
        node: createPrimitiveNodeState("mv"),
        version: null,
    };
    const root = createObjectNodeState();
    root.state.items["title"] = {
        node: createPrimitiveNodeState("mv"),
        version: null,
    };
    root.state.items["description"] = {
        node: createPrimitiveNodeState("lww"),
        version: null,
    };
    root.state.items["startAt"] = {
        node: createPrimitiveNodeState("lww"),
        version: null,
    };
    root.state.items["endAt"] = {
        node: createPrimitiveNodeState("lww"),
        version: null,
    };
    root.state.items["organizer"] = {
        node: createRefNodeState("lww"),
        version: null,
    };
    root.state.items["location"] = {
        node: locationNode,
        version: null,
    };
    root.state.items["tags"] = {
        node: createSetNodeState(),
        version: null,
    };
    root.state.items["attendees"] = {
        node: createArrayNodeState(),
        version: null,
    };
    root.state.items["metadata"] = {
        node: metadataNode,
        version: null,
    };
    return root;
}
const defaultApplyContext = {
    policy: {
        defaultPrimitiveSemantics: "mv",
        defaultRefSemantics: "lww",
    },
};
export class CalendarEventHarness {
    objectId;
    applyContext;
    replicaState;
    constructor(options) {
        this.objectId = options.objectId ?? "event-1";
        this.applyContext = options.applyContext ?? defaultApplyContext;
        this.replicaState = createReplicaState(options.replicaId);
    }
    static fromReplica(replica, options) {
        const harness = new CalendarEventHarness({
            replicaId: replica.replicaId,
            objectId: options?.objectId ?? "event-1",
            applyContext: options?.applyContext ?? defaultApplyContext,
        });
        harness.replicaState = replica;
        return harness;
    }
    get replica() {
        return this.replicaState;
    }
    clone() {
        return CalendarEventHarness.fromReplica(this.replicaState, {
            objectId: this.objectId,
            applyContext: this.applyContext,
        });
    }
    replaceReplica(replica) {
        this.replicaState = replica;
        return this;
    }
    mergeFrom(other, replicaId = this.replica.replicaId) {
        this.replicaState = mergeReplicaStates(this.replicaState, other.replica, replicaId);
        return this;
    }
    bootstrapBaseEvent() {
        return this
            .setTitle("Team Sync")
            .setDescription("Weekly planning")
            .setStartAt("2026-03-07T10:00:00Z")
            .setEndAt("2026-03-07T11:00:00Z")
            .setOrganizer("user-1")
            .setRoom("A-101")
            .setBuilding("HQ")
            .addTag("team")
            .addAttendee("user-2")
            .setColor("blue")
            .setNote("base-note");
    }
    setTitle(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "field.set",
            path: ["title"],
            value,
        });
        return this;
    }
    setDescription(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "field.set",
            path: ["description"],
            value,
        });
        return this;
    }
    setStartAt(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "field.set",
            path: ["startAt"],
            value,
        });
        return this;
    }
    setEndAt(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "field.set",
            path: ["endAt"],
            value,
        });
        return this;
    }
    setOrganizer(userId) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "field.set",
            path: ["organizer"],
            value: {
                type: "ref",
                objectId: userId,
            },
        });
        return this;
    }
    setRoom(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "field.set",
            path: ["location", "room"],
            value,
        });
        return this;
    }
    setBuilding(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "field.set",
            path: ["location", "building"],
            value,
        });
        return this;
    }
    addTag(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "set.add",
            path: ["tags"],
            value,
        });
        return this;
    }
    removeTag(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "set.remove",
            path: ["tags"],
            value,
        });
        return this;
    }
    addAttendee(userId, index) {
        const attendees = this.getAttendees();
        const resolvedIndex = index ?? attendees.length;
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "array.insert",
            path: ["attendees"],
            index: resolvedIndex,
            value: {
                type: "ref",
                objectId: userId,
            },
        });
        return this;
    }
    removeAttendeeAt(index) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "array.remove",
            path: ["attendees"],
            index,
        });
        return this;
    }
    setColor(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "node.initObject",
            path: ["metadata"],
        });
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "field.set",
            path: ["metadata", "color"],
            value,
        });
        return this;
    }
    setNote(value) {
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "node.initObject",
            path: ["metadata"],
        });
        this.replicaState = applyLocalAction(this.replicaState, this.objectId, {
            type: "field.set",
            path: ["metadata", "note"],
            value,
        });
        return this;
    }
    materialize() {
        return materializeReplicaObject(this.replicaState, this.objectId, {
            applyContext: this.applyContext,
            initialRoot: createCalendarInitialRoot(),
        });
    }
    view() {
        return viewNode(this.materialize().root);
    }
    getObjectId() {
        return this.objectId;
    }
    getObjectView() {
        const current = this.view();
        if (current !== null &&
            typeof current === "object" &&
            !Array.isArray(current) &&
            !("kind" in current)) {
            return current;
        }
        return {};
    }
    getTitle() {
        return this.getObjectView()["title"];
    }
    getDescription() {
        return this.getObjectView()["description"];
    }
    getStartAt() {
        return this.getObjectView()["startAt"];
    }
    getEndAt() {
        return this.getObjectView()["endAt"];
    }
    getOrganizer() {
        return this.getObjectView()["organizer"];
    }
    getTags() {
        const value = this.getObjectView()["tags"];
        return Array.isArray(value) ? value : [];
    }
    getAttendees() {
        const value = this.getObjectView()["attendees"];
        return Array.isArray(value) ? value : [];
    }
    getLocation() {
        const location = this.getObjectView()["location"];
        if (location !== null && typeof location === "object" && !Array.isArray(location)) {
            return location;
        }
        return {};
    }
    getRoom() {
        return this.getLocation()["room"];
    }
    getBuilding() {
        return this.getLocation()["building"];
    }
    getMetadata() {
        const metadata = this.getObjectView()["metadata"];
        if (metadata !== null && typeof metadata === "object" && !Array.isArray(metadata)) {
            return metadata;
        }
        return {};
    }
    getColor() {
        return this.getMetadata()["color"];
    }
    getNote() {
        return this.getMetadata()["note"];
    }
    getAttendeeCount() {
        return this.getAttendees().length;
    }
    hasTag(tag) {
        return this.getTags().includes(tag);
    }
    getFirstAttendee() {
        const attendees = this.getAttendees();
        return attendees.length > 0 ? attendees[0] : null;
    }
}
