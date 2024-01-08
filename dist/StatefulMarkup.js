/*
    StatefulMarkup
    By Yash Pant
*/
var _a;
const _SM_Version = 0.1;
(function () {
    if (typeof StatefulMarkupClient !== typeof Function) {
        _SM_Log.log(2, "%c  SMClient must be first script to load.");
    }
    addEventListener("load", (e) => {
        _SM_Initialization.load();
        _SM_Engine.renderer();
    });
})();
class _SM_Initialization {
    /*
        {
            vars: [
                {}, {}, {}
            ]
        }
    */
    static load() {
        const _SM_DATA = localStorage.getItem("_SM_Data");
        if (_SM_DATA !== null) {
            const persistentData = JSON.parse(_SM_DATA);
            _SM_ValueInjector.init(persistentData.vars);
        }
    }
}
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
    /*
        Directly shard the current mirror if value injection is not required.
    */
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
        return transforms;
    }
}
_SM_Transforms._transforms = [];
/*
    ValueInjector works to replace all the vars present in the HTML with
    the values published through the SM Client.
*/
class _SM_ValueInjector {
    static init(persistents) {
        persistents.forEach(mapping => {
            this._varMap.set(mapping.var, mapping.val);
            _SM_Engine.inform('Pub');
        });
    }
    /*
        Force update updates the provided transforms even if mapping is as before.
        Used when a new transform is created.
    */
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
            if (shard.outerHTML === mirror.outerHTML) {
                tfmn.shard = null;
            }
            else
                newTransforms.push(tfmn);
        });
        _SM_Log.log(1, "%c  Value Injector update");
        return newTransforms;
    }
    static _mappingUpdater() {
        const unprocessedEvents = [];
        let isMappingUpdated = false;
        _SM_Manager.events.forEach(publishedEvent => {
            if (publishedEvent.event.type === undefined || publishedEvent.event.type === "update") {
                // if (typeof publishedEvent.event.options === typeof {}) {
                //     let persists = (publishedEvent.event.options as EventPubOptions).persists
                //     if (persists) {
                //         localStorage.setItem(localStorage.getItem)
                //     }
                // }
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
    static get _listeners() {
        return StatefulMarkupClient.eventListeners;
    }
    static update(transforms) {
        const shardList = document.createElement("EventBindingGroup");
        transforms.forEach(tfmn => {
            if (tfmn.shard) {
                shardList.append(tfmn.shard);
            }
        });
        this._listeners.forEach(listener => {
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
    static get _statelessUpdates() {
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
            this._statelessUpdates.forEach(fn => {
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
class _SM_Constructs {
    static update(transforms) {
        transforms.forEach(tfmn => {
            this._contentUnderEvaluation = tfmn.shard.innerHTML;
            let initialContent = this._contentUnderEvaluation;
            while (this._containsConstruct()) {
                this._parseConstruct();
            }
            if (initialContent !== this._contentUnderEvaluation) {
                if (tfmn.shard !== null) {
                    tfmn.shard.innerHTML = this._contentUnderEvaluation;
                }
                else {
                    console.log("Impossible - Conditional on Empty Shard.");
                }
            }
        });
        return transforms;
    }
    static _parseConstruct() {
        const [stmtStart, stmtEnd] = this._findConstructMarkers();
        const evaluatedValue = this._evaluateCondition(stmtStart + 6, stmtEnd - 1);
        this._contentUnderEvaluation = this._contentUnderEvaluation.replace(this._contentUnderEvaluation.substring(stmtStart, stmtEnd + 9), evaluatedValue);
    }
    static _evaluateCondition(openingBracketPos, closingBracketPos) {
        const constructCode = this._contentUnderEvaluation.substring(openingBracketPos, closingBracketPos);
        return (new Function(constructCode))();
    }
    static _findConstructMarkers() {
        let conditionalStart = this._contentUnderEvaluation.indexOf("@_cond");
        let conditionalEnd = this._contentUnderEvaluation.indexOf("@_endcond");
        return [conditionalStart, conditionalEnd];
    }
    static _containsConstruct() {
        let index = this._contentUnderEvaluation.indexOf("@_cond");
        if (index === -1)
            return false;
        return true;
    }
}
/*
    Render process explanation -
    In case of external manipulation, every element sharded by it must go through the rest of
    the phases. If a publish event is joined with it, the Value Injector will go through all transforms,
    since these can independently affect mirrors.
    
    A ConstructEval always goes in hand with a VI, since VI's can change the evaluated variables in
    constructs.

    If there is only a event binding change, a cheap copy of the mirror is made, and the event binding
    occurs directly on the mirror's clone.
*/
class _SM_Engine {
    /*
        Responsible for informing the renderer about the events occurring through SMClient.
        The renderer will update itself according to its own conditions and necessities.
    */
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
            _a.renderer();
    }
    static renderer() {
        if (this.rendererIntrinsics.phase === 'idle') {
            this.rendererIntrinsics.phase = 'wait';
            if (StatefulMarkupConfig.isBatchRendered) {
                setTimeout(() => {
                    this.rendererIntrinsics.phase = 'start';
                    this.renderer();
                }, 1000 / this.rendererIntrinsics.frameTarget);
                return;
            }
            else {
                this.rendererIntrinsics.phase = 'start';
            }
        }
        if (this.rendererIntrinsics.phase === 'start') {
            let tfmns = _SM_Transforms.transforms;
            _SM_Log.log(3, "%c StartPhase");
            if (this._observedOperations.ExtStatelessUpdate) {
                _SM_Log.log(3, "%c Ext Manip");
                let t1 = _SM_ExternalJS.update(tfmns);
                if (!this._observedOperations.PublishEvent) {
                    tfmns = _SM_ValueInjector.update(t1, true);
                }
                else
                    tfmns = _SM_ValueInjector.update(tfmns, true);
                tfmns = _SM_Constructs.update(tfmns);
                tfmns = _SM_EventBinder.update(tfmns);
            }
            else if (this._observedOperations.PublishEvent) {
                _SM_Log.log(3, "%c VI");
                tfmns = _SM_ValueInjector.update(tfmns);
                tfmns = _SM_Constructs.update(tfmns);
                tfmns = _SM_EventBinder.update(tfmns);
            }
            else if (this._observedOperations.EventBindingUpdate) {
                _SM_Log.log(3, "%c Skipped VI, CE");
                tfmns = _SM_Transforms.shardCurrentMirror(tfmns);
                tfmns = _SM_EventBinder.update(tfmns);
            }
            else {
                console.log(2, "%c  Impossible Render phase.");
            }
            _SM_Transforms.update(tfmns);
            this.rendererIntrinsics.phase = 'idle';
        }
        /*
            An init phase indicates the stage before the very first render.
            Here subscribers must be refreshed.
        */
        if (this.rendererIntrinsics.phase === 'init') {
            _SM_Log.log(3, "%c init phase");
            let subscribers = _SM_Manager.refreshSubs();
            let tfmns = _SM_Transforms.createTransforms(subscribers);
            tfmns = _SM_ExternalJS.update(tfmns);
            tfmns = _SM_ValueInjector.update(tfmns);
            tfmns = _SM_EventBinder.update(tfmns);
            _SM_Transforms.update(tfmns);
            this.rendererIntrinsics.phase = 'idle';
        }
        this._observedOperations.reset();
        _SM_Log.log(1, '%c  Render phase finished.');
    }
}
_a = _SM_Engine;
_SM_Engine._observedOperations = {
    PublishEvent: false,
    EventBindingUpdate: false,
    ExtStatelessUpdate: false,
    reset: () => {
        _a._observedOperations.PublishEvent = false;
        _a._observedOperations.EventBindingUpdate = false;
        _a._observedOperations.ExtStatelessUpdate = false;
    }
};
_SM_Engine.rendererIntrinsics = {
    phase: 'init',
    frameTarget: StatefulMarkupConfig.FRAME_TARGET
};
class _SM_Log {
    static log(severity, message) {
        if (severity === 1) {
            if (StatefulMarkupConfig.DEBUG_LOGS || StatefulMarkupConfig.DEBUG_MODE) {
                console.log(message, this._colorSev1);
            }
        }
        else if (severity === 2) {
            console.log(message, this._colorSev2);
        }
        else {
            console.log(message, this._colorSev3);
        }
    }
}
_SM_Log._colorSev1 = 'color: yellow';
_SM_Log._colorSev2 = 'color: red';
_SM_Log._colorSev3 = 'color: green';
