/* 
    StatefulMarkup
    By Yash Pant
*/

// Initializes the list of subscribers.
(function () {
    addEventListener("load", (e) => {
        setTimeout(() => {
            _SM_Engine.test()
        }, 500)
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

class _SM_ValueInjector {

    // static saveInitialData() {
    //     document.get
    //     _SM_Manager.subs.forEach((e) => {
    //         const item = [e, ]
    //     })
    // }

    static #transform = []
}

class _SM_Engine {
    static test() {
        _SM_Manager.refreshSubs()
        _SM_ValueInjector.saveInitialData()
    }
}





// Coalesce all the updates on the same var to the last val -> map

// function getAllEasyDivs() { } // All subscribers in a pubsub model.

// function clearDivs() { }

// function getComponentDefinition() { } //A different js file should contain the components

// function createState() { } // Creates state for a div and binds to it

// function updateState() { }

// function updateUI() { } // what about batched updates? For that, probably we can collect all updates
// in a pool and update the ui every x milliseconds
// Reminds me of a gameloop