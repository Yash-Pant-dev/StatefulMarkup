/* 
    StatefulMarkup
    By Yash Pant
*/

const _SM_Version = 0.1;

(function () {

    if (typeof StatefulMarkupClient !== typeof Function) {
        _SM_Log.log(2, '%c  SMClient must be first script to load.')
    }

    addEventListener('load', (e) => {
        _SM_Initialization.loadPersistentData()
        _SM_Engine.renderer()
    })
})()

const persistKeyword = '_SM_Persist_'

class _SM_Initialization {

    static loadPersistentData() {
        let persistingEvents: Array<SMEvent> = []

        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i)
            let val = localStorage.getItem(key!)!

            if (key?.startsWith(persistKeyword)) {
                persistingEvents.push({
                    id: StatefulMarkupClient._eventId++,
                    event: {
                        type: 'update_p',
                        var: key.substring(persistKeyword.length),
                        val: val
                    }
                })
            }
        }

        persistingEvents.push(...StatefulMarkupClient.eventsBuffer)
        StatefulMarkupClient.eventsBuffer = persistingEvents
    }

    static __clearPersistingData() {

        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i)

            if (key?.startsWith(persistKeyword)) {
                localStorage.removeItem(key)
            }
        }
    }
}

/* 
    The Manager handles communicating done by the PubSub model.
*/
class _SM_Manager {

    static readonly SUBSCRIBER_TAG = '_sm'

    static get events() {
        return StatefulMarkupClient.eventsBuffer
    }

    /* 
        This method is useful to clear the eventsBuffer from already processed events.
    */
    static set events(newEventsBuffer) {
        StatefulMarkupClient.eventsBuffer = newEventsBuffer
    }

    static get subs() {
        return this._subs
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
        return this._subs = Array.from(document.getElementsByClassName(this.SUBSCRIBER_TAG))
    }

    private static _subs: Array<SMSubscriber> = []
}

class _SM_Transforms {

    /* 
        Create a link between the original DOM elements and the currently displayed
        stateful mirrors, and the shards which are under construction mirrors for the next render.
    */
    static createTransforms(subscribers: Array<SMSubscriber>) {

        const newTransforms: Array<SMTransform> = []

        subscribers.forEach(element => {
            const mirror = element.cloneNode(true) as Element
            const transformation = { element, mirror, shard: null } // A null shard has no updates.
            element.replaceWith(mirror)

            this._transforms.push(transformation)
            newTransforms.push(transformation)
        })

        return newTransforms
    }

    /* 
        Directly shard the current mirror if value injection is not required.
    */
    static shardCurrentMirror(transforms: Array<SMTransform>) {

        transforms.forEach(tfmn => {
            tfmn.shard = tfmn.mirror.cloneNode(true) as Element
        })

        return transforms
    }

    static get transforms() {
        return this._transforms
    }

    static resetTransforms() {
        this._transforms = []
    }

    /* 
        Makes the final DOM update to replace the mirrors with shards.
        Only mirrors that were changed have been replaced, hence there are no
        unnecessary replacements.
    */
    static update(transforms: Array<SMTransform>) {

        transforms.forEach(tfmn => {
            if (tfmn.shard) {
                tfmn.mirror.replaceWith(tfmn.shard)
                tfmn.mirror = tfmn.shard
            }
            tfmn.shard = null
        })

        _SM_Log.log(1, '%c  Transforms update')
        return transforms
    }

    private static _transforms: Array<SMTransform> = []
}


/* 
    ValueInjector works to replace all the vars present in the HTML with 
    the values published through the SM Client. 
*/
class _SM_ValueInjector {

    /* 
        Force update updates the provided transforms even if mapping is as before.
        Used when a new transform is created.
    */
    static update(transforms: Array<SMTransform>, forceUpdate = false) {

        const isMappingUpdated = this._mappingUpdater()
        const newTransforms: Array<SMTransform> = []
        if (!forceUpdate && !isMappingUpdated)
            return newTransforms;


        transforms.forEach((tfmn) => {
            const element = tfmn.element
            const shard = tfmn.shard ?? element.cloneNode(true) as Element

            const mirror = tfmn.mirror

            // Inject values in attributes
            for (let elementAttributeName of element.getAttributeNames()) {
                let shardAttributeName = elementAttributeName as string
                let shardAttributeValue = element.getAttribute(elementAttributeName) as string

                if (elementAttributeName.startsWith('_sm_')) {
                    let possibleVariable = elementAttributeName.substring(4)
                    if (this._varMap.get(possibleVariable)) {
                        shardAttributeName = this._varMap.get(possibleVariable)!
                    }
                }
                shardAttributeValue = this._replacer(shardAttributeValue)
                shard.setAttribute(shardAttributeName, shardAttributeValue)
            }

            // Inject values in innerHTML
            const shardContent = this._replacer(element.innerHTML)
            shard.innerHTML = shardContent
            tfmn.shard = shard

            if (shard.outerHTML === mirror.outerHTML) {
                tfmn.shard = null
            }
            else
                newTransforms.push(tfmn)
        })

        _SM_Log.log(1, '%c  Value Injector update')
        return newTransforms
    }

    private static _mappingUpdater() {
        const unprocessedEvents: Array<SMEvent> = []
        let isMappingUpdated = false

        _SM_Manager.events.forEach(evt => {
            if (evt.event.type === undefined
                || evt.event.type === 'update'
                || evt.event.type === 'update_p'
                || evt.event.type === 'component') {

                if (evt.event.type === 'update_p') {
                    localStorage.setItem(persistKeyword + evt.event.var, evt.event.val as string)
                }

                if (this._varMap.get(evt.event.var) != evt.event.val) {
                    isMappingUpdated = true
                    this._varMap.set(evt.event.var, evt.event.val)
                }
            }
            else {
                unprocessedEvents.push(evt)
            }
        })

        _SM_Manager.events = unprocessedEvents
        return isMappingUpdated
    }

    /* 
        An optional map can be passed which replaces the search string with entries 
        in the map, instead of _varMap. 
    */
    static _replacer(input: string, map?: Map<string, string>) {
        let output = input

        this._markupConversions.forEach((v, k, m) => {
            const varRegex = new RegExp(k, 'g')
            output = output.replace(varRegex, v)
        })

        if (!map)
            map = this._varMap

        // Sort variable map so that longest matching variables replace instead of shortest 
        map = new Map([...map.entries()].sort((a, b) => {
            if (a[0].length === b[0].length)
                return 0
            if (a[0].length < b[0].length)
                return 1
            return -1
        }))

        map.forEach((v, k, m) => {
            const varRegex = new RegExp('@' + k, 'g')
            output = output.replace(varRegex, v)
        })

        return output
    }

    static __clearMap() {
        this._varMap.clear()
    }

    static _getMapping() {
        return this._varMap
    }

    private static _markupConversions = new Map<string, string>([
        ["&lt;", "<"],
        ["&gt;", ">"],
    ])
    private static _varMap = new Map<string, string>()
}

/* 
    Construct Injector -
    Evaluates special terms starting with @_ such as @_for/@_if
*/
class _SM_ConstructInjector {

    static content: string

    static update(transforms: Array<SMTransform>) {

        transforms.forEach(tfmn => {

            if (!tfmn.shard)
                [tfmn] = _SM_Transforms.shardCurrentMirror([tfmn])
            this.content = tfmn.shard!.innerHTML
            this.parseConstructs()
            tfmn.shard!.innerHTML = this.content
        })

        _SM_Log.log(1, '%c  Construct Injector update')
        return transforms
    }

    // Identifies and evaluates all constructs in code.
    private static parseConstructs() {

        while (this.containsConstruct()) {

            let [start, retStart, retEnd] = this._getMarkers()
            this._evaluate(start, retStart, retEnd)
        }
    }

    private static containsConstruct() {
        return this.content.includes('@_')
    }

    // Find the @_for/if construct, along with start and end brackets of body
    private static _getMarkers() {

        let start = -1, bodyStart = -1, bodyEnd = -1
        let balance = 0
        for (let i = 0; i < this.content.length - 1; i++) {
            let chars = this.content[i] + this.content[i + 1]
            if (chars === '@_') {
                if (start === -1) {
                    start = i
                }
            }
            else if (chars === '@{') {
                balance++
                if (bodyStart === -1)
                    bodyStart = i
            }
            else if (chars === '}@') {
                balance--
                if (balance === 0) {
                    bodyEnd = i
                    break;
                }
            }
        }

        if (Math.min(start, bodyStart, bodyEnd) === -1) {
            throw Error('Insufficient markers.')
        }
        return [start, bodyStart, bodyEnd]
    }

    // Passes the evaluation to the relevant construct type.
    private static _evaluate(start: number, bodyStart: number, bodyEnd: number) {

        let constructTag = this._getConstructTag(start)
        
        switch (constructTag) {
            case 'for':
                this._forInjection(start, bodyStart, bodyEnd)
                break
            case 'if':
                this._ifInjection(start, bodyStart, bodyEnd)
                break
            default: // Not a basic if / for construct but posxsibly a plugin
                const pluginIndex = _SM_PluginHelper.findPlugin(constructTag, 'Construct')
                // Not present in plugins also, hence invalid construct.
                if (pluginIndex === -1) throw Error('Invalid Construct Name - ' + constructTag)
                
                _SM_PluginHelper.plugins[pluginIndex].injectionFn?.(start, bodyStart, bodyEnd)
        }
    }

    private static _getConstructTag(idx: number) {

        let headerBracketStart = this.content.substring(idx).indexOf('(') + idx
        let constructTag = this.content.substring(idx + 2, headerBracketStart).trim()

        return constructTag
    }

    /* 
        Injects variables to @_x.properties collected from the array of objects in the
        header of @_for()
    */
    private static _forInjection(start: number, retStart: number, retEnd: number) {

        const forTagLen = 5 // @_for
        let header = this.content.substring(start + forTagLen, retStart).trim()
        header = header.substring(1, header.length - 1)

        let collection = JSON.parse(header) as Array<JSONObj>
        let originalStructure = this.content.substring(retStart + 2, retEnd)

        let bodyExpansion = ''
        collection.forEach(objectItem => {

            let objectData = new Map<string, any>()

            for (const prop in objectItem) {
                objectData.set('x_.' + prop, objectItem[prop])
            }
            /* 
                Exposing each header element directly is useful if a simple array is passed, however then any undefined property
                access turns into [object Object].
                If a user wishes to pass in a direct array, he would instead have to create an object from the element,
                and then access it through named properties.
            */
            objectData.set('x_. ', objectItem)

            bodyExpansion += _SM_ValueInjector._replacer(originalStructure, objectData)
        })

        let modifiedContent = this.content.substring(0, start)
            + bodyExpansion
            + this.content.substring(retEnd + 2, this.content.length)

        this.content = modifiedContent
    }

    private static _ifInjection(start: number, retStart: number, retEnd: number) {

        const forTagLen = 4 // @_if
        let header = this.content.substring(start + forTagLen, retStart).trim()
        header = header.substring(1, header.length - 1)

        let isConditionTrue = false
        try {
            isConditionTrue = eval(header)
        }
        catch (e) {
            _SM_Log.log(3, '%c  If header evaluation failed. [This may be intentional]')
        }

        let bodyExpansion = ''

        if (isConditionTrue)
            bodyExpansion = this.content.substring(retStart + 2, retEnd)

        let modifiedContent = this.content.substring(0, start)
            + bodyExpansion
            + this.content.substring(retEnd + 2, this.content.length)

        this.content = modifiedContent
    }
}


/* 
    A cloned node does not contain the event listeners associated with the original
    element. Hence, every shard must re attach the provided event listeners.

    In case only event binders have been updated, we can directly clone the mirror 
    for an efficient copy.
*/
class _SM_EventBinder {

    private static get _listeners() {
        return StatefulMarkupClient.eventListeners
    }

    static update(transforms: Array<SMTransform>) {
        const shardList = document.createElement('EventBindingGroup')

        transforms.forEach(tfmn => {
            if (!tfmn.shard) {
                tfmn.shard = tfmn.mirror.cloneNode(true) as Element
            }
            shardList.append(tfmn.shard)
        })

        this._listeners.forEach(listener => {
            shardList.querySelectorAll(listener.selector).
                forEach(DOMElement => {
                    DOMElement.addEventListener(
                        listener.onEvent,
                        listener.callback,
                        listener.optionalArgs
                    )
                })
        })

        _SM_Log.log(1, '%c  EventBinder update')
        return transforms
    }

    // Should be used in exceptional cases only.
    __removeEventListenerBinding(listenerId: Id) {
        return StatefulMarkupClient.eventListeners =
            StatefulMarkupClient.eventListeners.filter(el => {
                el.id != listenerId
            })
    }

    __clearAllEventListenerBindings() {
        StatefulMarkupClient.eventListeners = []
    }
}

class _SM_ExternalJS {

    private static get _statelessUpdates() {
        return StatefulMarkupClient.statelessUpdates
    }

    /* 
        Performs updates on the original DOM elements to provide structural modifications.
        The updates must not depend on any state exposed by the StatefulMarkup.
    */
    static update(transforms: Array<SMTransform>) {
        const newTransforms: Array<SMTransform> = []

        transforms.forEach(tfmn => {
            const elementDocument = document.createElement('ExternalManipulationGroup')
            elementDocument.append(tfmn.element)

            let wasUpdated = false

            this._statelessUpdates.forEach(fn => {
                elementDocument.querySelectorAll(fn.selector).forEach(DOMElement => {
                    wasUpdated = true
                    fn.modifier(DOMElement)
                })
            })

            if (wasUpdated) {
                tfmn.shard = tfmn.element.cloneNode(true) as Element
                newTransforms.push(tfmn)
            }
        })

        return newTransforms
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
    static inform(operation: SMOperation) {
        switch (operation) {
            case 'Sless':
                this._observedOperations.ExtStatelessUpdate = true
                break;
            case 'EvBind':
                this._observedOperations.EventBindingUpdate = true
                break;
            case 'Pub':
                this._observedOperations.PublishEvent = true
                break;
            default:
                _SM_Log.log(2, 'Invalid operation in SM.inform')
                break;
        }

        if (this.rendererIntrinsics.phase === 'idle')
            _SM_Engine.renderer()
    }

    static renderer() {

        if (this.rendererIntrinsics.phase === 'idle') {

            /* A setTimeout is often of the order of milliseconds, so batch rendering may be irrelevant if target
             framerate is greater than 144ps */
            if (StatefulMarkupConfig.isBatchRendered && this.rendererIntrinsics.targetFramerate <= 144) {
                this.rendererIntrinsics.phase = 'wait'

                setTimeout(() => {
                    this.rendererIntrinsics.phase = 'start'
                    this.renderer()
                }, 1000 / this.rendererIntrinsics.targetFramerate)

                return
            }
            else {
                this.rendererIntrinsics.phase = 'start'
            }
        }

        // TODO: Explain why certain phases are not utilized in different situations.
        if (this.rendererIntrinsics.phase === 'start') {
            _SM_Log.log(3, '%c  StartPhase')
            let tfmns = _SM_Transforms.transforms

            if (this._observedOperations.ExtStatelessUpdate) {
                _SM_Log.log(3, '%c  Ext Manip')
                let t1 = _SM_ExternalJS.update(tfmns)
                if (!this._observedOperations.PublishEvent) {
                    _SM_ValueInjector.update(t1, true)
                    _SM_ConstructInjector.update(t1)
                    _SM_EventBinder.update(t1)
                }
                else {
                    _SM_ValueInjector.update(tfmns, true)
                    _SM_ConstructInjector.update(tfmns)
                    _SM_EventBinder.update(tfmns)
                }
            }
            else if (this._observedOperations.PublishEvent) {
                _SM_Log.log(3, '%c VI')
                tfmns = _SM_ValueInjector.update(tfmns)
                tfmns = _SM_ConstructInjector.update(tfmns)
                tfmns = _SM_EventBinder.update(tfmns)
            }
            else if (this._observedOperations.EventBindingUpdate) {
                _SM_Log.log(3, '%c Skipped VI, CE')
                tfmns = _SM_Transforms.shardCurrentMirror(tfmns)
                tfmns = _SM_EventBinder.update(tfmns)
            }
            else {
                _SM_Log.log(2, '%c  Impossible Render phase.')
            }

            _SM_Reconcilliation.saveState()
            _SM_Transforms.update(tfmns);
        }

        /* 
            An init phase indicates the stage before the very first render.
        */
        if (this.rendererIntrinsics.phase === 'init') {
            _SM_Log.log(3, '%c  init phase')

            let subscribers = _SM_Manager.refreshSubs()
            let tfmns = _SM_Transforms.createTransforms(subscribers)
            _SM_ExternalJS.update(tfmns)
            _SM_ValueInjector.update(tfmns, true)
            /* 
                Performing operations on all tfmns is important since
                one can use constructs without value injection 
            */
            _SM_ConstructInjector.update(tfmns)
            _SM_EventBinder.update(tfmns)

            _SM_Reconcilliation.saveState()
            _SM_Transforms.update(tfmns)
        }

        this._observedOperations.reset()
        _SM_Reconcilliation.reconcile()

        if (this.rendererIntrinsics.phase === 'init')
            _SM_Engine.showSubscribers()

        document.dispatchEvent(new Event('RenderEvent'))
        _SM_Log.log(1, '%c  Render phase finished.')
        this.rendererIntrinsics.frameNumber++
        this.rendererIntrinsics.phase = 'idle'
    }

    static _observedOperations = {

        PublishEvent: false,
        EventBindingUpdate: false,
        ExtStatelessUpdate: false,

        reset: () => {
            this._observedOperations.PublishEvent = false
            this._observedOperations.EventBindingUpdate = false
            this._observedOperations.ExtStatelessUpdate = false
        }
    }

    static rendererIntrinsics = {
        phase: 'init',
        targetFramerate: StatefulMarkupConfig.TARGET_FRAMERATE,
        frameNumber: 1
    }

    static showSubscribers() {
        document.querySelectorAll('._sm_HideUntilReady').forEach((element) => {
            (element as HTMLElement).style.opacity = '1'
        })
    }
}

/* 
    Contains two stages - Save state and Reconcile.
    Save state saves the details that get lost when a DOM Node gets cloned,
    such as focus, text selection, checkbox checks etc.
    Reconcile re-adds them when the transforms get updated.
*/
class _SM_Reconcilliation {

    static saveState() {

        let unprocessedEvents: Array<SMEvent> = []

        _SM_Manager.events.forEach(evt => {
            if (evt.event.type !== 'saveState') {
                unprocessedEvents.push(evt)
            }
            else {
                this._savedTargets.push(evt.event)
            }
        })

        _SM_Manager.events = unprocessedEvents

        this._savedTargets.forEach((evt) => {
            switch (evt.on) {
                case 'input-text':
                    this.saveInputState(evt)
                    break
                default:
                    // A plugin might possibly handle this save event.
                    const pluginIndex = _SM_PluginHelper.findPlugin(evt.on, 'Reconcile')
                    
                    if (pluginIndex === -1) {
                        _SM_Log.log(2, '%c  Saving state not defined for type - ' + evt.on)
                        break
                    }
                    _SM_PluginHelper.plugins[pluginIndex].saveFn?.(evt)
                    break
            }
        })
    }

    static reconcile() {

        this.savedStates.forEach((save) => {

            switch (save.on) {
                case 'input-text':
                    this.reconcileInputState(save)
                    break;
                default:
                    // A plugin might possibly handle this save event.
                    const pluginIndex = _SM_PluginHelper.findPlugin(save.on, 'Reconcile')
                    if (pluginIndex === -1) {
                        _SM_Log.log(2, 'Reconciling state not defined for type - ' + save.on)
                        break
                    }
                    _SM_PluginHelper.plugins[pluginIndex].reconcileFn?.(save)
                    break
            }
        })

        this.savedStates = []
    }

    static saveInputState(evt: ReconcilliationEvent) {

        let currentState: ReconcilliationEvent = { on: 'input-text', selector: evt.selector }
        let selector = evt.selector
        let element = document.querySelector(selector)

        if (element === null)
            return _SM_Log.log(2, 'Save state element not found, selector: ' + selector)

        currentState.wasFocused = (document.activeElement === element) + ''
        // @ts-ignore
        currentState.selectionStart = element.selectionStart
        // @ts-ignore
        currentState.selectionEnd = element.selectionEnd
        this.savedStates.push(currentState)
    }

    static reconcileInputState(save: ReconcilliationEvent) {

        let element = document.querySelector(save.selector)

        if (element === null)
            return _SM_Log.log(2, 'Cannot find element to reconcile - ' + save.selector)

        if (save.wasFocused === 'true') {
            (element as HTMLElement).focus()
        }

        // @ts-ignore
        element.setSelectionRange(save.selectionStart, save.selectionEnd)
    }

    static __clearTargets() {
        this._savedTargets = []
    }

    private static _savedTargets: Array<RecTarget> = []
    static savedStates: Array<EventDetails> = []
}

class _SM_PluginHelper {

    static findPlugin(name: string, phase: 'Reconcile' | 'Construct') {
        let plgIndex = 0

        for (const plg of StatefulMarkupClient.plugins) {
            if (plg.name === name && plg.phase === phase) {
                return plgIndex
            }
            plgIndex++
        }
        return -1
    }

    static get plugins() {
        return StatefulMarkupClient.plugins
    }
}

class _SM_Log {

    private static _colorSev1 = 'color: yellow'
    private static _colorSev2 = 'color: red'
    private static _colorSev3 = 'color: green'

    static log(severity: number, message: string) {
        if (severity === 1) {
            if (StatefulMarkupConfig.DEBUG_LOGS || StatefulMarkupConfig.DEBUG_MODE) {
                console.log(message, this._colorSev1)
            }
        }
        else if (severity === 2) {
            console.log(message, this._colorSev2)
        }
        else {
            console.log(message, this._colorSev3)
        }
    }
}

document.dispatchEvent(new Event('EngineLoaded'))