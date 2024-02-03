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
        Adds the components provided to the framework on the Engine.
    */
    static addComponent(cmp: Component) {

        cmp.events?.forEach(evt => StatefulMarkupClient._eventsBuffer.push(
            {
                id: StatefulMarkupClient._eventId++,
                event: evt
            }))

        StatefulMarkupClient.eventsBuffer.push({
            id: StatefulMarkupClient._eventId++,
            event: {
                type: "component",
                var: "@" + cmp.name,
                val: cmp.template
            }
        });


        if (cmp.eventListeners?.length > 0) {
            cmp.eventListeners.forEach(el => {
                StatefulMarkupClient._eventListeners.push(
                    {
                        id: StatefulMarkupClient._listenerId++,
                        selector: el.selector,
                        onEvent: el.onEvent,
                        callback: el.callback,
                        optionalArgs: el.optionalArgs
                    })
            })
            StatefulMarkupClient._informEngine('EvBind');
        }

        StatefulMarkupClient._informEngine('Pub');
    }

    /* Extend functionality using plugins */
    addPlugins(plugins: Array<PluginDetails>) {

        plugins.forEach(plugin => {
            switch (plugin.phase) {
                case "Construct":
                    StatefulMarkupClient._plugins.push({
                        id: StatefulMarkupClient._pluginId++,
                        name: plugin.name,
                        phase: 'Construct',
                        injectionFn: plugin.injectionFn
                    })
                    break;
                case "Reconcile":
                    StatefulMarkupClient._plugins.push({
                        id: StatefulMarkupClient._pluginId++,
                        name: plugin.name,
                        phase: 'Reconcile',
                        saveFn: plugin.saveFn,
                        reconcileFn: plugin.reconcileFn
                    })
                    break;
                default:
                    console.log('Plugins not yet implementable for this phase:', plugin.phase)
                    break
            }
        })
    }

    static _informEngine(operation: SMOperation) {
        if (typeof _SM_Engine === typeof Function) {
            _SM_Engine.inform(operation)
        }
    }

    // Get the current variable mapping used for variable injection.
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

    static get plugins() {
        return this._plugins
    }

    private static _eventsBuffer: Array<SMEvent> = []
    static _eventId = 1

    private static _eventListeners: Array<SMListener> = []
    private static _listenerId = 1

    private static _statelessUpdates: Array<SMExterns> = []
    private static _updateId = 1

    private static _plugins: Array<SMPlugin> = []
    private static _pluginId = 1
}

/* 
    Contains configurable variables for framework behaviour, mostly useful for debugging.
*/
class StatefulMarkupConfig {
    static DEBUG_MODE = false

    static DEBUG_LOGS = false // Log warnings.
    static DISABLE_BATCH_RENDERER = false // If false, updates are not batched for performance.
    static TARGET_FRAMERATE = 60

    static get isBatchRendered() {
        if (this.DISABLE_BATCH_RENDERER)
            return false
        return true
    }
}