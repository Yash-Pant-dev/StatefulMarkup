/* 
    StatefulMarkup
    By Yash Pant
*/

// _SM_Engine loop.
(function () {
    addEventListener("load", (e) => {

        _SM_Manager.refreshSubs()

        setTimeout(() => {
            _SM_ValueInjector.updateMapping()
            _SM_ValueInjector.createTransformLinks()
            _SM_ValueInjector.update()
            // _SM_Engine.test()
        }, 500)

        setTimeout(() => {
            _SM_ValueInjector.updateMapping()
            _SM_ValueInjector.update()
            // _SM_Engine.test()
        }, 3000)
    })
})()


/* 
    Broker acts as the source of truth of all pubs and subs.
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

/* 
    ValueInjector works to replace all the vars present in the HTML with 
    the values provided to the SMClient. 
*/
class _SM_ValueInjector {

    static createTransformLinks() {
        this.#transform = []

        _SM_Manager.subs.forEach((e) => {
            const clonedNode = e.cloneNode(true)
            const item = { original: e, current: clonedNode }
            e.replaceWith(clonedNode)
            this.#transform = [...this.#transform, item]
        })
    }

    // TODO: Remove previously processed events.
    static updateMapping() {
        _SM_Manager.events.forEach((e) => {
            this.#varMap.set(e.event.var, e.event.val)
        })
    }

    static update() {
        this.#transform.forEach((e) => {
            let origNode = e.original
            let currentNode = e.current
            let newNode = origNode.cloneNode(true)

            // Inject values in attributes
            for (let origAttrName of origNode.getAttributeNames()) {
                let origAttrVal = origNode.getAttribute(origAttrName)

                if (origAttrName.startsWith("@") && this.#varMap.has(origAttrName)) {
                    origAttrName = this.#varMap.get(origAttrName)
                }
                origAttrVal = this._replacer(origAttrVal)

                newNode.setAttribute(origAttrName, origAttrVal)
            }

            // Inject values in innerHTML
            let newContent = origNode.innerHTML
            newContent = this._replacer(newContent)
            newNode.innerHTML = newContent
            
            currentNode.replaceWith(newNode)
            e.current = newNode
        })
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
    static #transform = []
}

class _SM_EventBinder {

    static eventListeners() {
        return StatefulMarkupClient.eventListeners
    }

    static update() {
        this.eventListeners.forEach(fn => {
            fn()
        })
    }
}

class _SM_Engine {
    static test() {
        _SM_ValueInjector.createTransformLinks()
        _SM_ValueInjector.updateMapping()
        setTimeout(() => {
            _SM_ValueInjector.update()
            // _SM_EventBinder.update()
        }, 500)
    }
}

// Before refresh subs, all vars must be updated with value = @varName
// Coalesce all the updates on the same var to the last val -> map
// When an update is queued, wait for 16 ms and then perform updates?