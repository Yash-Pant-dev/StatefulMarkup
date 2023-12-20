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

        console.log(StatefulMarkupClient.#eventsBuffer)
    }

    static get events() {
        return this.#eventsBuffer
    }

    static #eventsBuffer = []
    static #id = 1
}