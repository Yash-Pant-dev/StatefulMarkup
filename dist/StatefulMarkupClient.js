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
    static _informEngine(operation) {
        if (typeof _SM_Engine === typeof Function) {
            _SM_Engine.inform(operation);
        }
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
}
StatefulMarkupClient._eventsBuffer = [];
StatefulMarkupClient._eventId = 1;
StatefulMarkupClient._eventListeners = [];
StatefulMarkupClient._listenerId = 1;
StatefulMarkupClient._statelessUpdates = [];
StatefulMarkupClient._updateId = 1;
class StatefulMarkupConfig {
    static get isBatchRendered() {
        // TODO: Uncomment
        // if (this.DEBUG_MODE || this.DISABLE_BATCH_RENDERER)
        //     return false
        return true;
    }
}
/*  If true, each of the following are toggled from their default values. */
StatefulMarkupConfig.DEBUG_MODE = true;
StatefulMarkupConfig.REFRESH_SUBS_ALWAYS = false; // Refresh subs after every update.
StatefulMarkupConfig.DEBUG_LOGS = false; // Verbose logging.
StatefulMarkupConfig.DISABLE_BATCH_RENDERER = false; // If false, updates are not batched for performance.
StatefulMarkupConfig.FRAME_TARGET = 30;
