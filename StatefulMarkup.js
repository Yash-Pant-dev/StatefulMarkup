/* 
    StatefulMarkup
    By Yash Pant
*/

// _SM_Engine loop.
(function () {
    addEventListener("load", (e) => {
        _SM_Engine.update()
        // setTimeout(() => {
        //     _SM_Engine.update(false)
        // }, 1500)
    })
})()


/* 
    Manager acts as the source of truth of all pubs and subs.
*/
class _SM_Manager {

    static get events() {
        return this.#events = StatefulMarkupClient.events
    }

    static get subs() {
        return this.#subs
    }

    static refreshSubs() {
        const SM_CLASSNAME = "_sm" // Identifies the divs that use StatefulMarkup
        return this.#subs = Array.from(document.getElementsByClassName(SM_CLASSNAME))
    }

    static #events = []
    static #subs = []
}

class _SM_Transforms {

    // Likely need to refresh subs before creating transforms anew?
    static createTransforms() {
        this.#transforms = []

        _SM_Manager.subs.forEach(element => {
            const mirror = element.cloneNode(true)
            const transformation = { element, mirror, shard: null } // Shard: Null means no updates!
            element.replaceWith(mirror)

            this.#transforms = [...this.#transforms, transformation]
        })
    }

    static get transforms() {
        return this.#transforms
    }

    // A replaceClone may be required
    static update() {
        this.#transforms.forEach(tfmn => {
            if (tfmn.shard) {
                tfmn.mirror.replaceWith(tfmn.shard)
                tfmn.mirror = tfmn.shard
            }
            tfmn.shard = null
        })

        console.log("Update Transform")

    }

    static #transforms = []
}
// One flow can be updation of transforms through value injection, html injection and event binding
// and finally getting updated through the update fn here.

/* 
    ValueInjector works to replace all the vars present in the HTML with 
    the values provided to the SMClient. 
*/
class _SM_ValueInjector {

    static update() {

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

        console.log("Update VI")
    }

    // TODO: Remove previously processed events.
    // static _variableUpdate() {
    //     _SM_Manager.events.forEach((e) => {
    //         this.#varMap.set(e.event.var, e.event.val)
    //     })
    // }

    static set variableMap(args) {
        let variable = args.var
        let value = args.val

        if (!(this.#varMap.has(variable) && this.#varMap.get(variable) == value)) {
            this.#varMap.set(variable, value)
        }

        _SM_Engine.updateNeeded = true
        _SM_Engine.update()
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

// class _SM_Conditionals {

//     static update() {


//     }

//     _ifFinder(inputText) {
//         for (x in inputText)
//     }
// }
// TODO: rename elements, mirror, shard
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

        console.log("Update EL")
    }

    // Typically you should not need to use this if code has been correctly structured.
    _rare_removeEventListenerBinding(listenerId) {
        return StatefulMarkupClient.eventListeners =
            StatefulMarkupClient.eventListeners.filter(el => {
                el.id != listenerId
            })
    }

    static #shardDocument
}

class _SM_Engine {

    static update(forceUpdate = false) {

        if (this.#firstTime || forceUpdate) {
            _SM_Manager.refreshSubs()
            _SM_Transforms.createTransforms()
            this.#firstTime = false
        }
        _SM_ValueInjector.update()
        _SM_EventBinder.update()

        // if(this.updateNeeded) {
        _SM_Transforms.update()
        this.updateNeeded = false
        // }
        // setTimeout(() => {
        //     this.update(false)
        // }, NaN)
    }

    static test() {
        _SM_Transforms.createTransforms()
        _SM_ValueInjector.update()
        setTimeout(() => {
            _SM_ValueInjector.update()
            // _SM_EventBinder.update()
        }, 500)
    }

    static updateNeeded = false
    static #firstTime = true
}



// Before refresh subs, all vars must be updated with value = @varName / Cloned will be replaced with orig
// Coalesce all the updates on the same var to the last val -> map
// When an update is queued, wait for 16 ms and then perform updates?