/*
    StatefulMarkup
    By Yash Pant
*/
const _SM_Version = 0.1;
(function () {
    addEventListener("load", (e) => {
        _SM_Engine.renderer();
    });
})();
/*
    The Manager handles communicating done by the PubSub model.
*/
class _SM_Manager {
    static get events() {
        return StatefulMarkupClient.eventsBuffer;
    }
    /*
        This method is useful to clear the eventsBuffer from already processed events.
    */
    static set events(newEventsBuffer) {
        StatefulMarkupClient.eventsBuffer = newEventsBuffer;
    }
    static get subs() {
        console.log(this._subs);
        return this._subs;
    }
    /*
        Finds the DOM elements subscribing to state updates from the framework (marked by
        containing an _sm class).
        Also used when external JS scripts are modifying the classNames of DOM elements
        to add or remove the _sm value.
        Must be called if the framework ever loses track of subscribed DOM element
        so that it can re-subscribe or needs to track a newly subscribed element.
    */
    static refreshSubs() {
        const SM_CLASSNAME = "_sm";
        return this._subs = Array.from(document.getElementsByClassName(SM_CLASSNAME));
    }
}
_SM_Manager._subs = [];
class _SM_Transforms {
    /*
        Create a link between the original DOM elements and the currently displayed
        stateful mirrors, and the shards which are under construction mirrors for the next render.
        Called on every refreshSubs event from the user, hence typically not needed to call explicitly.
    */
    static createTransforms(subscribers) {
        const newTransforms = [];
        subscribers.forEach(element => {
            const mirror = element.cloneNode(true);
            const transformation = { element, mirror, shard: null }; // A null shard has no updates.
            element.replaceWith(mirror);
            this._transforms.push(transformation);
            newTransforms.push(transformation);
        });
        return newTransforms;
    }
    static shardCurrentMirror(transforms) {
        transforms.forEach(tfmn => {
            tfmn.shard = tfmn.mirror.cloneNode(true);
        });
        return transforms;
    }
    static get transforms() {
        return this._transforms;
    }
    static resetTransforms() {
        this._transforms = [];
    }
    /*
        Makes the final DOM update to replace the mirrors with shards.
        Only mirrors that were changed have been replaced, hence there are no
        unnecessary replacements.
    */
    static update(transforms) {
        transforms.forEach(tfmn => {
            if (tfmn.shard) {
                tfmn.mirror.replaceWith(tfmn.shard);
                tfmn.mirror = tfmn.shard;
            }
            tfmn.shard = null;
        });
        _SM_Log.log(1, "%c  Transforms update");
    }
}
_SM_Transforms._transforms = [];
/*
    ValueInjector works to replace all the vars present in the HTML with
    the values published through the SM Client.
*/
class _SM_ValueInjector {
    // Force update is necessary if a new transform / subscriber is created.
    static update(transforms, forceUpdate = false) {
        const isMappingUpdated = this._mappingUpdater();
        const newTransforms = [];
        if (!forceUpdate && !isMappingUpdated)
            return newTransforms;
        transforms.forEach((tfmn) => {
            const element = tfmn.element;
            const shard = element.cloneNode(true);
            const mirror = tfmn.mirror;
            // Inject values in attributes
            for (let elementAttributeName of element.getAttributeNames()) {
                let shardAttributeName = elementAttributeName;
                let shardAttributeValue = element.getAttribute(elementAttributeName);
                if (elementAttributeName.startsWith("_sm_")) {
                    let possibleVariable = elementAttributeName.replace("_sm_", "");
                    if (this._varMap.has(possibleVariable)) {
                        shardAttributeName = this._varMap.get(possibleVariable);
                    }
                }
                shardAttributeValue = this._replacer(shardAttributeValue);
                shard.setAttribute(shardAttributeName, shardAttributeValue);
            }
            // Inject values in innerHTML
            const shardContent = this._replacer(element.innerHTML);
            shard.innerHTML = shardContent;
            tfmn.shard = shard;
            if (shard.outerHTML == mirror.outerHTML && !forceUpdate) {
                tfmn.shard = null;
            }
            newTransforms.push(tfmn);
        });
        _SM_Log.log(1, "%c  Value Injector update");
        return newTransforms;
    }
    static _mappingUpdater() {
        const unprocessedEvents = [];
        let isMappingUpdated = false;
        _SM_Manager.events.forEach(publishedEvent => {
            if (publishedEvent.event.type === undefined || publishedEvent.event.type === "varUpdate") {
                if (this._varMap.get(publishedEvent.event.var) != publishedEvent.event.val) {
                    isMappingUpdated = true;
                    this._varMap.set(publishedEvent.event.var, publishedEvent.event.val);
                }
            }
            else {
                unprocessedEvents.push(publishedEvent);
            }
        });
        _SM_Manager.events = unprocessedEvents;
        return isMappingUpdated;
    }
    static _replacer(input) {
        let output = input;
        this._varMap.forEach((v, k, m) => {
            const varRegex = new RegExp("@" + k, "g");
            output = output.replace(varRegex, v);
        });
        return output;
    }
    static __clearMap() {
        this._varMap.clear();
    }
}
_SM_ValueInjector._varMap = new Map();
class _SM_EventBinder {
    static get listeners() {
        return StatefulMarkupClient.eventListeners;
    }
    static update(transforms) {
        const shardList = document.createElement("EventBindingGroup");
        transforms.forEach(tfmn => {
            if (tfmn.shard) {
                shardList.append(tfmn.shard);
            }
        });
        this.listeners.forEach(listener => {
            shardList.querySelectorAll(listener.selector).
                forEach(DOMElement => (DOMElement.addEventListener(listener.onEvent, listener.callback, listener.optionalArgs)));
        });
        _SM_Log.log(1, "%c  EventBinder update");
        return transforms;
    }
    // Should be used in exceptional cases only.
    __removeEventListenerBinding(listenerId) {
        return StatefulMarkupClient.eventListeners =
            StatefulMarkupClient.eventListeners.filter(el => {
                el.id != listenerId;
            });
    }
    __clearAllEventListenerBindings() {
        StatefulMarkupClient.eventListeners = [];
    }
}
class _SM_ExternalJS {
    static get statelessUpdates() {
        return StatefulMarkupClient.statelessUpdates;
    }
    /*
        Performs updates on the original DOM elements.
    */
    static update(transforms) {
        const newTransforms = [];
        transforms.forEach(tfmn => {
            const elementDocument = document.createElement("ExternalManipulationGroup");
            elementDocument.append(tfmn.element);
            let wasUpdated = false;
            this.statelessUpdates.forEach(fn => {
                elementDocument.querySelectorAll(fn.selector).forEach(DOMElement => {
                    wasUpdated = true;
                    fn.modifier(DOMElement);
                });
            });
            if (wasUpdated) {
                tfmn.shard = tfmn.element.cloneNode(true);
                newTransforms.push(tfmn);
            }
        });
        return newTransforms;
    }
}
// class _SM_Conditionals {
//     /* 
//         Read innerHTML
//         Find @if, eval condition.
//         Concat the results together.
//         Re-start finding @if from the joining point in case of nested @if 
//     */
//     update() {
//         _SM_Transforms.transforms.forEach(tfmn => {
//             // let lengthInnerHTML = tfmn.shard.innerHTML.length
//             let currentIndex = 0
//             let shardContent = tfmn.shard.innerHTML
//             let ifPosition = shardContent.indexOf("@_if")
//             for (let i = 0; i < shardContent.length)
//         })
//     }
// }
class _SM_Engine {
    static inform(operation) {
        switch (operation) {
            case 'Sless':
                this._observedOperations.ExtStatelessUpdate = true;
                break;
            case 'EvBind':
                this._observedOperations.EventBindingUpdate = true;
                break;
            case 'Pub':
                this._observedOperations.PublishEvent = true;
                break;
            default:
                _SM_Log.log(2, 'Invalid operation in SM.inform');
                break;
        }
        if (this.rendererIntrinsics.phase === 'idle')
            _SM_Engine.renderer();
    }
    static renderer() {
        if (this.rendererIntrinsics.phase === 'idle') {
            this.rendererIntrinsics.phase = 'wait';
            setTimeout(() => {
                this.rendererIntrinsics.phase = 'start';
                this.renderer();
            }, StatefulMarkupConfig.isBatchRendered ? 1000 / this.rendererIntrinsics.frameTarget : 0);
            return;
        }
        if (this.rendererIntrinsics.phase === 'start') {
            let tfmns = _SM_Transforms.transforms;
            if (this._observedOperations.ExtStatelessUpdate) {
                tfmns = _SM_ExternalJS.update(tfmns);
                tfmns = _SM_ValueInjector.update(tfmns, true);
                tfmns = _SM_EventBinder.update(tfmns);
            }
            else if (this._observedOperations.EventBindingUpdate && !this._observedOperations.PublishEvent) {
                tfmns = _SM_Transforms.shardCurrentMirror(tfmns);
                tfmns = _SM_EventBinder.update(tfmns);
            }
            else {
                tfmns = _SM_ValueInjector.update(tfmns);
                tfmns = _SM_EventBinder.update(tfmns);
            }
            _SM_Transforms.update(tfmns);
            this.rendererIntrinsics.phase = 'idle';
        }
        if (this.rendererIntrinsics.phase === 'init') {
            let subscribers = _SM_Manager.refreshSubs();
            let tfmns = _SM_Transforms.createTransforms(subscribers);
            console.log("init", tfmns);
            tfmns = _SM_ExternalJS.update(tfmns);
            tfmns = _SM_ValueInjector.update(tfmns);
            tfmns = _SM_EventBinder.update(tfmns);
            _SM_Transforms.update(tfmns);
            this.rendererIntrinsics.phase = 'idle';
        }
        _SM_Log.log(1, '%c  Render phase finished.');
    }
}
_SM_Engine._observedOperations = {
    PublishEvent: false,
    EventBindingUpdate: false,
    ExtStatelessUpdate: false
};
_SM_Engine.rendererIntrinsics = {
    phase: 'init',
    frameTarget: 30
};
class _SM_Log {
    static log(severity, message) {
        if (severity == 1) {
            if (StatefulMarkupConfig.DEBUG_LOGS || StatefulMarkupConfig.DEBUG_MODE) {
                console.log(message, this.colorSev1);
            }
        }
        else {
            console.log(message, this.colorSev2);
        }
    }
}
_SM_Log.colorSev1 = 'color: yellow';
_SM_Log.colorSev2 = 'color: red';
