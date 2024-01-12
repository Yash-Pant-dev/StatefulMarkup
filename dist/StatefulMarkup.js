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
        _SM_Initialization.loadPersistingData();
        _SM_Engine.renderer();
    });
})();
const persistKeyword = "_SM_Persist_";
class _SM_Initialization {
    static loadPersistingData() {
        let persistingEvents = [];
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            let val = localStorage.getItem(key);
            if (key === null || key === void 0 ? void 0 : key.startsWith(persistKeyword)) {
                persistingEvents.push({
                    id: StatefulMarkupClient._eventId++,
                    event: {
                        type: "update_p",
                        var: key.substring(persistKeyword.length),
                        val: val
                    }
                });
            }
        }
        persistingEvents.push(...StatefulMarkupClient.eventsBuffer);
        StatefulMarkupClient.eventsBuffer = persistingEvents;
    }
    static __clearPersistingData() {
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key === null || key === void 0 ? void 0 : key.startsWith(persistKeyword)) {
                localStorage.removeItem(key);
            }
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
            var _b;
            const element = tfmn.element;
            const shard = (_b = tfmn.shard) !== null && _b !== void 0 ? _b : element.cloneNode(true);
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
        _SM_Manager.events.forEach(evt => {
            if (evt.event.type === undefined
                || evt.event.type === "update"
                || evt.event.type === "update_p"
                || evt.event.type === "component") {
                if (evt.event.type === "update_p") {
                    localStorage.setItem(persistKeyword + evt.event.var, evt.event.value);
                }
                if (this._varMap.get(evt.event.var) != evt.event.val) {
                    isMappingUpdated = true;
                    this._varMap.set(evt.event.var, evt.event.val);
                }
            }
            else {
                unprocessedEvents.push(evt);
            }
        });
        _SM_Manager.events = unprocessedEvents;
        return isMappingUpdated;
    }
    /*
        An optional map can be passed which replaces the search string with entries
        in the map, instead of _varMap.
    */
    static _replacer(input, map) {
        let output = input;
        if (!map)
            map = this._varMap;
        map.forEach((v, k, m) => {
            const varRegex = new RegExp("@" + k, "g");
            output = output.replace(varRegex, v);
        });
        return output;
    }
    static __clearMap() {
        this._varMap.clear();
    }
    static _getMapping() {
        return this._varMap;
    }
}
_SM_ValueInjector._varMap = new Map();
/*
    Construct Injector -
    Evaluates special terms starting with @_ such as @_for/@_if
*/
class _SM_ConstructInjector {
    static update(transforms) {
        transforms.forEach(tfmn => {
            this.content = tfmn.shard.innerHTML;
            this.parseConstructs();
            tfmn.shard.innerHTML = this.content;
        });
        _SM_Log.log(1, "%c  Construct Injector update");
        return transforms;
    }
    // Identifies and evaluates all constructs in code.
    static parseConstructs() {
        while (this.containsConstruct()) {
            let [start, retStart, retEnd] = this._getMarkers();
            this._evaluate(start, retStart, retEnd);
        }
    }
    static containsConstruct() {
        return this.content.includes("@_");
    }
    // Find the @_for/if construct, along with start and end brackets of body
    static _getMarkers() {
        let start = -1, bodyStart = -1, bodyEnd = -1;
        let balance = 0;
        for (let i = 0; i < this.content.length - 1; i++) {
            let chars = this.content[i] + this.content[i + 1];
            if (chars === "@_") {
                if (start === -1) {
                    start = i;
                }
            }
            else if (chars === "@{") {
                balance++;
                if (bodyStart === -1)
                    bodyStart = i;
            }
            else if (chars === "}@") {
                balance--;
                if (balance === 0) {
                    bodyEnd = i;
                    break;
                }
            }
        }
        if (Math.min(start, bodyStart, bodyEnd) === -1) {
            throw Error("Insufficient markers.");
        }
        return [start, bodyStart, bodyEnd];
    }
    // Passes the evaluation to the relevant construct type.
    static _evaluate(start, retStart, retEnd) {
        let constructType = this._getConstructTag(start);
        if (constructType === 'for') {
            this._forInjection(start, retStart, retEnd);
        }
        else if (constructType === 'if') {
            this._ifInjection(start, retStart, retEnd);
        }
        else
            throw Error("Invalid constructType");
    }
    static _getConstructTag(idx) {
        let constructName = '';
        for (let i = idx; i < this.content.length; i++) {
            constructName += this.content[i];
            switch (constructName) {
                case '@_for': {
                    return 'for';
                }
                case '@_if': {
                    return 'if';
                }
                default:
                    break;
            }
        }
        throw Error("No construct found");
    }
    /*
        Injects variables to @_x.properties collected from the array of objects in the
        header of @_for()
    */
    static _forInjection(start, retStart, retEnd) {
        const forTagLen = 5; // @_for
        let header = this.content.substring(start + forTagLen, retStart).trim();
        header = header.substring(1, header.length - 1);
        let collection = JSON.parse(header);
        let curExpansion = this.content.substring(retStart + 2, retEnd);
        let bodyExpansion = '';
        collection.forEach(objectItem => {
            let objectData = new Map();
            for (const prop in objectItem) {
                objectData.set("_x." + prop, objectItem[prop]);
            }
            curExpansion = _SM_ValueInjector._replacer(curExpansion, objectData);
            bodyExpansion += curExpansion;
        });
        let modifiedContent = this.content.substring(0, start)
            + bodyExpansion
            + this.content.substring(retEnd + 2, this.content.length);
        this.content = modifiedContent;
    }
    static _ifInjection(start, retStart, retEnd) {
        const forTagLen = 4; // @_for
        let header = this.content.substring(start + forTagLen, retStart).trim();
        header = header.substring(1, header.length - 1);
        let isConditionTrue = eval(header);
        let bodyExpansion = '';
        if (isConditionTrue)
            bodyExpansion = this.content.substring(retStart + 2, retEnd);
        let modifiedContent = this.content.substring(0, start)
            + bodyExpansion
            + this.content.substring(retEnd + 2, this.content.length);
        this.content = modifiedContent;
    }
}
/*
    A cloned node does not contain the event listeners associated with the original
    element. Hence, every shard must re attach the provided event listeners.

    In case only event binders have been updated, we can directly clone the mirror
    for an efficient copy.
*/
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
        Performs updates on the original DOM elements to provide structural modifications.
        The updates must not depend on any state exposed by the StatefulMarkup.
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
            if (StatefulMarkupConfig.isBatchRendered) {
                this.rendererIntrinsics.phase = 'wait';
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
            _SM_Log.log(3, "%c  StartPhase");
            if (this._observedOperations.ExtStatelessUpdate) {
                _SM_Log.log(3, "%c  Ext Manip");
                let t1 = _SM_ExternalJS.update(tfmns);
                if (!this._observedOperations.PublishEvent) {
                    tfmns = _SM_ValueInjector.update(t1, true);
                }
                else
                    tfmns = _SM_ValueInjector.update(tfmns, true);
                tfmns = _SM_ConstructInjector.update(tfmns);
                tfmns = _SM_EventBinder.update(tfmns);
            }
            else if (this._observedOperations.PublishEvent) {
                _SM_Log.log(3, "%c VI");
                tfmns = _SM_ValueInjector.update(tfmns);
                tfmns = _SM_ConstructInjector.update(tfmns);
                tfmns = _SM_EventBinder.update(tfmns);
            }
            else if (this._observedOperations.EventBindingUpdate) {
                _SM_Log.log(3, "%c Skipped VI, CE");
                tfmns = _SM_Transforms.shardCurrentMirror(tfmns);
                tfmns = _SM_EventBinder.update(tfmns);
            }
            else {
                _SM_Log.log(2, "%c  Impossible Render phase.");
            }
            _SM_Transforms.update(tfmns);
            this.rendererIntrinsics.phase = 'idle';
        }
        /*
            An init phase indicates the stage before the very first render.
        */
        if (this.rendererIntrinsics.phase === 'init') {
            _SM_Log.log(3, "%c  init phase");
            let subscribers = _SM_Manager.refreshSubs();
            let tfmns = _SM_Transforms.createTransforms(subscribers);
            _SM_ExternalJS.update(tfmns);
            tfmns = _SM_ValueInjector.update(tfmns);
            tfmns = _SM_ConstructInjector.update(tfmns);
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
    frameTarget: StatefulMarkupConfig.TARGET_FRAMERATE
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