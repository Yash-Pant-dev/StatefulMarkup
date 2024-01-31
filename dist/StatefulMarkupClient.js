/*
    Author - Yash Pant.
    V - 0.1
*/
/* INFO: Must be first script loaded. */
/*
    SM Client serving as message passer to the SM Engine which performs the updates.
    Functions similar to a publisher in a Pub-Sub model.

    The main purpose of the Client is to provide a minimal client to be loaded first,
    and collect all events & listeners for the SM.js file to handle later.
*/
class StatefulMarkupClient {
    constructor(...args) {
        console.log("StatefulMarkup Client initialized -v0.1", ...args);
    }
    /*
        Kept non static to make it accessible from an object.
        We keep a publisher type method to make it extendable for future event types
        apart from the var updates, such as refreshSubs.
    */
    publish(newEvent) {
        StatefulMarkupClient._eventsBuffer.push({
            id: StatefulMarkupClient._eventId++,
            event: newEvent
        });
        StatefulMarkupClient._informEngine('Pub');
    }
    update(variable, value) {
        this.publish({ var: variable, val: value });
    }
    /*
        addListener collects all the data required for it to efficiently bind to just the
        updated shards. If we instead used a format like
        (domCollection(using document.getElementById),onEvent etc)
        then it would update the mirrors instead of the (yet unadded to the DOM) shards.
    */
    addListener(selector, onEvent, callback, optionalArgs) {
        StatefulMarkupClient._eventListeners.push({
            id: StatefulMarkupClient._listenerId++,
            selector,
            onEvent,
            callback,
            optionalArgs
        });
        StatefulMarkupClient._informEngine('EvBind');
    }
    /*
        Allows for manipulation of DOM elements through JS.
        The modification should not depend on any values injected by @vars, ie only stateless updates
        must be performed.
    */
    addExternalManipulation(selector, modifier) {
        StatefulMarkupClient._statelessUpdates.push({
            id: StatefulMarkupClient._updateId++,
            selector,
            modifier
        });
        StatefulMarkupClient._informEngine('Sless');
    }
    /*
        Registers the components provided to the framework on the Engine.
    */
    static registerComponent(cmp) {
        var _a, _b;
        (_a = cmp.events) === null || _a === void 0 ? void 0 : _a.forEach(evt => StatefulMarkupClient._eventsBuffer.push({
            id: StatefulMarkupClient._eventId++,
            event: evt
        }));
        StatefulMarkupClient.eventsBuffer.push({
            id: StatefulMarkupClient._eventId++,
            event: {
                type: "component",
                var: "@" + cmp.name,
                val: cmp.template
            }
        });
        if (((_b = cmp.eventListeners) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            cmp.eventListeners.forEach(el => {
                StatefulMarkupClient._eventListeners.push({
                    id: StatefulMarkupClient._listenerId++,
                    selector: el.selector,
                    onEvent: el.onEvent,
                    callback: el.callback,
                    optionalArgs: el.optionalArgs
                });
            });
            StatefulMarkupClient._informEngine('EvBind');
        }
        StatefulMarkupClient._informEngine('Pub');
    }
    static _informEngine(operation) {
        if (typeof _SM_Engine === typeof Function) {
            _SM_Engine.inform(operation);
        }
    }
    currentState(variable) {
        return _SM_ValueInjector._getMapping().get(variable);
    }
    static set eventsBuffer(newEventsBuffer) {
        this._eventsBuffer = newEventsBuffer;
    }
    static get eventsBuffer() {
        return this._eventsBuffer;
    }
    static get eventListeners() {
        return this._eventListeners;
    }
    static set eventListeners(newListeners) {
        this._eventListeners = newListeners;
    }
    static get statelessUpdates() {
        return this._statelessUpdates;
    }
    static _dumpLogs() {
        console.groupCollapsed("StatefulMarkup Logs - t elapsed:", (Date.now() - this.INIT_TIME) / 1000);
        console.groupCollapsed("PubSub");
        console.log(StatefulMarkupClient.eventsBuffer);
        console.log(StatefulMarkupClient.eventListeners);
        console.log(StatefulMarkupClient.statelessUpdates);
        console.groupEnd();
        if (typeof _SM_Engine !== undefined) {
            console.groupCollapsed("Engine");
            console.log(_SM_Transforms.transforms);
            console.log(_SM_ValueInjector._getMapping());
            console.groupEnd();
            console.groupCollapsed("Renderer");
            console.log(_SM_Engine.rendererIntrinsics);
            console.log(_SM_Engine._observedOperations);
            console.groupEnd();
        }
        console.groupEnd();
    }
}
StatefulMarkupClient._eventsBuffer = [];
StatefulMarkupClient._eventId = 1;
StatefulMarkupClient._eventListeners = [];
StatefulMarkupClient._listenerId = 1;
StatefulMarkupClient._statelessUpdates = [];
StatefulMarkupClient._updateId = 1;
StatefulMarkupClient.INIT_TIME = Date.now();
/*
    Contains configurable variables for framework behaviour, mostly useful for debugging.
*/
class StatefulMarkupConfig {
    static get isBatchRendered() {
        if (this.DISABLE_BATCH_RENDERER)
            return false;
        return true;
    }
}
StatefulMarkupConfig.DEBUG_MODE = false;
StatefulMarkupConfig.DEBUG_LOGS = false; // Verbose logging.
StatefulMarkupConfig.DISABLE_BATCH_RENDERER = false; // If false, updates are not batched for performance.
StatefulMarkupConfig.TARGET_FRAMERATE = 60;
