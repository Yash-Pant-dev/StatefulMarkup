/* INFO: Must be first script loaded. */

/* 
    SM Client serving as message passer to the SM Engine which performs the updates.
    Functions similar to a publisher in a Pub-Sub model.
*/
class StatefulMarkupClient {

    constructor(...args) {
        console.log("Client initialized -", args)
    }

    // Kept non static to make it accessible from an object.
    publish(newEvent) {

        StatefulMarkupClient.#eventsBuffer = [...StatefulMarkupClient.#eventsBuffer,
        {
            id: StatefulMarkupClient.#id++,
            event: newEvent
        }]

        // console.log(StatefulMarkupClient.#eventsBuffer)
    }

    static get events() {
        return this.#eventsBuffer
    }

    bindEventListener(...funcs) {
        StatefulMarkupClient.#eventListeners = [...StatefulMarkupClient.#eventListeners,
            ...funcs
        ]
    }

    static get eventListeners() {
        return this.#eventListeners
    }

    static #eventListeners = []
    static #eventsBuffer = []
    static #id = 1
}

class StatefulMarkupConfig {
    static DEBUG_MODE = false // If true, each of the following are toggled from their natural values.

    static REFRESH_SUBS_ALWAYS = false // Refresh subs after every update.
    static DEBUG_LOGS = false // Verbose logging.
    static BATCH_RENDERER = true // If false, updates are not batched for performance.
} 