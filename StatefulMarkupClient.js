/* INFO: Must be first script loaded. */

/* 
    SM Client serving as message passer to the SM Engine which performs the updates.
    Functions similar to a publisher in a Pub-Sub model.

    The main purpose of the Client is to provide a minimal client to be loaded first,
    and collect all events & listeners for the SM.js file to handle later.
    */
class StatefulMarkupClient {

    constructor(...args) {
        console.log("StatefulMarkup Client initialized -", ...args)
    }

    /*  
        Kept non static to make it accessible from an object. 
        We keep a publisher type method to make it extendable for future event types
        apart from the var updates, such as refreshSubs.
    */
    publish(newEvent) {

        StatefulMarkupClient.#eventsBuffer.push(
            {
                id: StatefulMarkupClient.#eventId++,
                event: newEvent
            })
    }

    /*  
        addListener collects all the data required for it to efficiently bind to just the 
        updated shards. If we instead used a format like 
        (domCollection(using document.getElementById),onEvent etc) 
        then it would update the mirrors instead of the (yet unadded to the DOM) shards. 
    */
    addListener(selector, onEvent, callback, optionalArgs) {
        return StatefulMarkupClient.#eventListeners.push(
            {
                id: StatefulMarkupClient.#listenerId++,
                selector,
                onEvent,
                callback,
                optionalArgs
            })
    }

    /* 
        Allows for manipulation of DOM elements through JS.

        If the modification does not depend on any @vars / @_ifs, use the stateless update
        which is more efficient.
        If it depends on @vars/@_if evaluation or if you aren't sure, use stateful updates.
    */
    addExternalManipulation(selector, modifier, stateful = true) {
        if (stateful)
            StatefulMarkupClient.#statefulExternals.push(
                {
                    id: StatefulMarkupClient.#externalId++,
                    selector,
                    modifier,
                })
        if (!stateful)
            StatefulMarkupClient.#statelessExternals.push(
                {
                    id: StatefulMarkupClient.#externalId++,
                    selector,
                    modifier,
                })

    }

    static set eventsBuffer(newEventsBuffer) {
        this.#eventsBuffer = newEventsBuffer
    }

    static get eventListeners() {
        return this.#eventListeners
    }

    static get statefulExternals() {
        return this.#statefulExternals
    }
    static get statelessExternals() {
        return this.#statelessExternals
    }
    static set statelessExternals(newStatelessExternals) {
        this.#statelessExternals = newStatelessExternals
    }

    static #eventsBuffer = []
    static #eventId = 1

    static #eventListeners = []
    static #listenerId = 1

    static #statefulExternals = []
    static #statelessExternals = []
    static #externalId = 1
}

class StatefulMarkupConfig {
    /*  If true, each of the following are toggled from their default values. */
    static DEBUG_MODE = true

    static REFRESH_SUBS_ALWAYS = false // Refresh subs after every update.
    static DEBUG_LOGS = false // Verbose logging.
    static DISABLE_BATCH_RENDERER = false // If false, updates are not batched for performance.
}