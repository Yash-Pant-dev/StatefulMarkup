/* INFO: Must be first script loaded. */

/* 
    SM Client serving as message passer to the SM Engine which performs the updates.
    Functions similar to a publisher in a Pub-Sub model.

    The main purpose of the Client is to provide a minimal client to be loaded first,
    and collect all events & listeners for the SM.js file to handle later.
    */
class StatefulMarkupClient {

    constructor(...args) {
        console.log("StatefulMarkup Client initialized -", args)
    }

    /*  Kept non static to make it accessible from an object. */
    publish(newEvent) {

        StatefulMarkupClient.#eventsBuffer = [...StatefulMarkupClient.#eventsBuffer,
        {
            id: StatefulMarkupClient.#eventId++,
            event: newEvent
        }]
    }

    static get events() {
        return this.#eventsBuffer
    }

    /*  
        The listeners must be collected in this format so that they be 
        relooped through for each element that updates in a render.
    */
    addListener(selector, onEvent, callback, optionalArgs) {
        return StatefulMarkupClient.#eventListeners = [...StatefulMarkupClient.#eventListeners,
        {
            id: StatefulMarkupClient.#listenerId++,
            selector,
            onEvent,
            callback,
            optionalArgs
        }
        ]
    }

    static get eventListeners() {
        return this.#eventListeners
    }

    static #eventListeners = []
    static #eventsBuffer = []
    static #eventId = 1
    static #listenerId = 1
}

class StatefulMarkupConfig {
    static DEBUG_MODE = false // If true, each of the following are toggled from their natural values.

    static REFRESH_SUBS_ALWAYS = false // Refresh subs after every update.
    static DEBUG_LOGS = false // Verbose logging.
    static BATCH_RENDERER = true // If false, updates are not batched for performance.
}