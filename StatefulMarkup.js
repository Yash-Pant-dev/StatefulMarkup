/* 
    StatefulMarkup
    By Yash Pant
*/

(function () {
    addEventListener("load", (e) => {
        _SM_Engine.update()
    })
})()


/* 
    The Manager handles communicating done by the PubSub model.
*/
class _SM_Manager {

    static get events() {
        return this.#events = StatefulMarkupClient.events
    }

    /* 
        This method is useful to clear the eventsBuffer from already processed events.
    */
    static set events(newEventsBuffer) {
        StatefulMarkupClient.eventsBuffer = newEventsBuffer
    }

    static get subs() {
        return this.#subs
    }

    /* 
        Finds the DOM elements subscribing to state updates from the framework (marked by
        containing an _sm class).
        Also used when external JS scripts are modifying the classNames of DOM elements
        to add or remove the _sm value.
        Must be called if the framework ever loses track of subscribed DOM element
        so that it can re-subscribe.
    */
    static refreshSubs() {
        const SM_CLASSNAME = "_sm"
        return this.#subs = Array.from(document.getElementsByClassName(SM_CLASSNAME))
    }

    static #events = []
    static #subs = []
}

class _SM_Transforms {

    /* 
        Create a link between the original DOM elements and the currently displayed
        stateful mirrors, and the shards which are under construction mirrors for the next render.
        Called on every refreshSubs event from the user, hence typically not needed to call explicitly.
    */
    static createTransforms() {
        this.#transforms = []

        _SM_Manager.subs.forEach(element => {
            const mirror = element.cloneNode(true)
            const transformation = { element, mirror, shard: null } // Shard: Null means no updates!
            element.replaceWith(mirror)

            this.#transforms.push(transformation)
        })
    }

    static get transforms() {
        return this.#transforms
    }

    /* 
        Makes the final DOM update to replace the mirrors with shards.
        Only mirrors that were changed have been replaced, hence there are no
        unnecessary replacements.
    */
    static update() {

        this.#transforms.forEach(tfmn => {
            if (tfmn.shard) {
                tfmn.mirror.replaceWith(tfmn.shard)
                tfmn.mirror = tfmn.shard
            }
            tfmn.shard = null
        })

        _SM_Log.log(1, "%c  Transforms update")
    }

    static #transforms = []
}


/* 
    ValueInjector works to replace all the vars present in the HTML with 
    the values published through the SMClient. 
*/
class _SM_ValueInjector {

    static update() {

        const updateRequired = this._variableUpdate()
        if (!updateRequired)
            return

        _SM_Transforms.transforms.forEach((tfmn) => {
            let element = tfmn.element
            let shard = tfmn.shard ?? element.cloneNode(true)

            // Inject values in attributes
            for (let elementAttributeName of element.getAttributeNames()) {
                let shardAttributeName = elementAttributeName
                let shardAttributeValue = element.getAttribute(elementAttributeName)

                if (elementAttributeName.startsWith("_sm_")) {
                    let possibleVariable = elementAttributeName.replace("_sm_", "")
                    if (this.#varMap.has(possibleVariable)) {
                        shardAttributeName = this.#varMap.get(possibleVariable)
                    }
                }
                shardAttributeValue = this._replacer(shardAttributeValue)

                shard.setAttribute(shardAttributeName, shardAttributeValue)
            }

            // Inject values in innerHTML
            let shardContent = this._replacer(element.innerHTML)
            shard.innerHTML = shardContent
            tfmn.shard = shard
        })

        _SM_Log.log(1, "%c  Value Injector update")
    }

    static _variableUpdate() {
        let unprocessedEvents = []
        let wereVariablesUpdated = false

        _SM_Manager.events.forEach(event => {
            if (event.type != "varUpdate") {
                unprocessedEvents.push(event)
            }
            else {
                if (this.#varMap.get(event.var) != event.val) {
                    wereVariablesUpdated = true
                    this.#varMap.set(event.var, event.val)
                }
            }
        })

        _SM_Manager.events = unprocessedEvents
        return wereVariablesUpdated
    }

    static _replacer(input) {
        let output = input

        this.#varMap.forEach((v, k, m) => {
            const varRegex = new RegExp("@" + k, "g")
            output = output.replace(varRegex, v)
        })

        return output
    }

    static #varMap = new Map()
}

class _SM_EventBinder {

    static get listeners() {
        return StatefulMarkupClient.eventListeners
    }

    static update() {
        this.#shardDocument = document.createElement("shardCollection")

        _SM_Transforms.transforms.forEach(tfmn => {
            if (tfmn.shard) {
                this.#shardDocument.append(tfmn.shard)
            }
        })

        this.listeners.forEach(listener => {
            this.#shardDocument.querySelectorAll(listener.selector).
                forEach(shard => (shard.addEventListener(
                    listener.onEvent,
                    listener.callback,
                    listener.optArgs
                )))
        })

        _SM_Log.log(1, "%c  EventBinder update")
    }

    // Should be used in exceptional cases only.
    _rare_removeEventListenerBinding(listenerId) {
        return StatefulMarkupClient.eventListeners =
            StatefulMarkupClient.eventListeners.filter(el => {
                el.id != listenerId
            })
    }

    static #shardDocument
}

class _SM_ExternalJS {
    
    static get statelessUpdates() {
        return StatefulMarkupClient.statelessExternals
    }

    static get statefulUpdates() {
        return StatefulMarkupClient.statefulExternals
    }

    // Is it safe to clear stateless updates after processing them once?
    static performStatelessUpdates() {

        let elementDocument = document.createElement("elementCollection")
        _SM_Transforms.transforms.forEach(tfmn => {
            elementDocument.append(tfmn.element)
        })

        this.statelessUpdates.forEach(update => {
            let externallyAffected = elementDocument.querySelectorAll(update.selector)
            
        })

        StatefulMarkupClient.statelessExternals = []
    }
}

class _SM_Engine {

    static update(firstTime = true, forceUpdate = false) {

        if (firstTime || forceUpdate) {
            _SM_Manager.refreshSubs()
            _SM_Transforms.createTransforms()
            firstTime = false
        }

        _SM_ValueInjector.update()
        _SM_EventBinder.update()

        _SM_Transforms.update()
    }
}

class _SM_Log {

    static colorSev1 = 'color: yellow'
    static colorSev2 = 'color: red'

    static log(severity, message) {
        if (severity == 1) {
            if (StatefulMarkupConfig.DEBUG_LOGS || StatefulMarkupConfig.DEBUG_MODE) {
                console.log(message, this.colorSev1)
            }
        }
        else {
            console.log(message, this.colorSev2)
        }
    }
}