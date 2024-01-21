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

    constructor(...args: string[]) {
        console.log("StatefulMarkup Client initialized -v0.1", ...args)
    }

    /*  
        Kept non static to make it accessible from an object. 
        We keep a publisher type method to make it extendable for future event types
        apart from the var updates, such as refreshSubs.
    */
    publish(newEvent: EventDetails) {
        StatefulMarkupClient._eventsBuffer.push(
            {
                id: StatefulMarkupClient._eventId++,
                event: newEvent
            })

        StatefulMarkupClient._informEngine('Pub')
    }
    update(variable: string, value: string) {
        this.publish({ var: variable, val: value })
    }

    /*  
        addListener collects all the data required for it to efficiently bind to just the 
        updated shards. If we instead used a format like 
        (domCollection(using document.getElementById),onEvent etc) 
        then it would update the mirrors instead of the (yet unadded to the DOM) shards. 
    */
    addListener(selector: QuerySelector, onEvent: OnEvent, callback: EventListener, optionalArgs: AddEventListenerOptions) {
        StatefulMarkupClient._eventListeners.push(
            {
                id: StatefulMarkupClient._listenerId++,
                selector,
                onEvent,
                callback,
                optionalArgs
            })

        StatefulMarkupClient._informEngine('EvBind')
    }

    /* 
        Allows for manipulation of DOM elements through JS.
        The modification should not depend on any values injected by @vars, ie only stateless updates
        must be performed.
    */
    addExternalManipulation(selector: QuerySelector, modifier: Function) {
        StatefulMarkupClient._statelessUpdates.push(
            {
                id: StatefulMarkupClient._updateId++,
                selector,
                modifier
            })

        StatefulMarkupClient._informEngine('Sless')
    }

    /* 
        Registers the components provided to the framework on the Engine.
    */
    static registerComponent(cmp: Component) {

        this.eventsBuffer.push({
            id: StatefulMarkupClient._eventId++,
            event: {
                type: "component",
                var: "@" + cmp.name,
                val: cmp.template
            }
        })

        StatefulMarkupClient._informEngine('Pub')
    }

    static _informEngine(operation: SMOperation) {
        if (typeof _SM_Engine === typeof Function) {
            _SM_Engine.inform(operation)
        }
    }

    currentState(variable: string) {
        return _SM_ValueInjector._getMapping().get(variable)
    }

    static set eventsBuffer(newEventsBuffer) {
        this._eventsBuffer = newEventsBuffer
    }
    static get eventsBuffer() {
        return this._eventsBuffer
    }

    static get eventListeners() {
        return this._eventListeners
    }
    static set eventListeners(newListeners) {
        this._eventListeners = newListeners
    }

    static get statelessUpdates() {
        return this._statelessUpdates
    }

    private static _eventsBuffer: Array<SMEvent> = []
    static _eventId = 1

    private static _eventListeners: Array<SMListener> = []
    private static _listenerId = 1

    private static _statelessUpdates: Array<SMExterns> = []
    private static _updateId = 1

    

    static INIT_TIME = Date.now()
    static _dumpLogs() {
        console.groupCollapsed("StatefulMarkup Logs - t elapsed:", (Date.now() - this.INIT_TIME) / 1000)
        console.groupCollapsed("PubSub")
        console.log(StatefulMarkupClient.eventsBuffer)
        console.log(StatefulMarkupClient.eventListeners)
        console.log(StatefulMarkupClient.statelessUpdates)
        console.groupEnd()
        if (typeof _SM_Engine !== undefined) {
            console.groupCollapsed("Engine")
            console.log(_SM_Transforms.transforms)
            console.log(_SM_ValueInjector._getMapping())
            console.groupEnd()
            console.groupCollapsed("Renderer")
            console.log(_SM_Engine.rendererIntrinsics)
            console.log(_SM_Engine._observedOperations)
            console.groupEnd()
        }
        console.groupEnd()
    }
}

/* 
    Contains configurable variables for framework behaviour, mostly useful for debugging.
*/
class StatefulMarkupConfig {
    static DEBUG_MODE = false

    static DEBUG_LOGS = false // Verbose logging.
    static DISABLE_BATCH_RENDERER = false // If false, updates are not batched for performance.
    static TARGET_FRAMERATE = 60

    static get isBatchRendered() {
        if (this.DISABLE_BATCH_RENDERER)
            return false
        return true
    }
}