class _SM_Debugger {
    static subscriberTag = '_sm' //typically _sm
    static INIT_TIME = Date.now()

    /* SM does not allow nesting subscribers classes in the DOM tree. */
    static test_NestedSubscribers() {

        let matches = Array.from(document.querySelectorAll('.' + this.subscriberTag + ' ' + '.' + this.subscriberTag))

        if (matches.length === 0) {
            this.test_Results.nestedSubscriber = { status: 'passed' }
            return
        }

        // @ts-ignore
        this.test_Results.nestedSubscriber = { status: 'failed', details: matches }
        console.log('%c Debugger')
    }

    // Events that are not handled.
    static test_UnhandledEvents() {

        if (!_SM_Manager.events.length) {
            this.test_Results.unhandledEvents = { status: 'passed' }
            return
        }

        // @ts-ignore
        this.test_Results.unhandledEvents = { status: 'failed', details: _SM_Manager.events }
    }

    // Variables that are uninitialized. Can lead to false positives, such as an email address.
    static test_UninitializedVars() {

        let matches = Array.from(document.querySelectorAll('.' + this.subscriberTag))
        let offendingElements: Array<{ idx: number, sub: Element }> = []
        matches.forEach(sub => {
            let idx = sub.outerHTML.indexOf('@')
            if (idx !== -1) {
                offendingElements.push({
                    idx,
                    sub
                })
            }
        })

        if (!offendingElements.length) {
            this.test_Results.uninitVars = { status: 'passed' }
            return
        }

        // @ts-ignore
        this.test_Results.uninitVars = { status: 'failed', details: offendingElements }
    }

    // Tests for subscribers with no reactive element. May be ok if you plan to later
    // add reactivity through external stateless manipulation.
    static test_NoReactivity() {

        let offendingElements: Array<{ idx: number, element: Element }> = []
        _SM_Transforms.transforms.forEach(tfmn => {
            let idx = tfmn.element.outerHTML.indexOf('@')
            if (idx === -1) {
                offendingElements.push({
                    idx,
                    element: tfmn.element
                })
            }
        })

        if (offendingElements.length) {
            console.log('[D]No variable in DOM tree, yet subscribed.', offendingElements)
            this.test_Results.noReactivity.status = 'failed'
            // @ts-ignore
            this.test_Results.noReactivity.details = offendingElements
        }
        else {
            this.test_Results.noReactivity = { status: 'passed' }
        }

    }

    static verboseLogging(logInterval?: number) {
        let id = setInterval(() => {
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
        }, logInterval ?? 10)

        return id
    }


    // Do one tfmn  through the renderer, do another through init phase, check the diff.
    static firstRenderTfmns: Array<SMTransform> = []
    static debugStrictMode(tfmns: Array<SMTransform>) {
        console.log('Debug strict mode.')
        this.firstRenderTfmns = []

        tfmns.forEach(tfmn => {
            this.firstRenderTfmns.push({
                element: tfmn.element.cloneNode(true) as Element,
                mirror: tfmn.mirror.cloneNode(true) as Element,
                shard: tfmn.shard?.cloneNode(true) as Element
            })
        })

        let strictRenderTfmns: Array<SMTransform> = []

        function strictRender() {
            _SM_Log.log(3, '%c  init phase')

            _SM_Transforms.resetTransforms()

            let subscribers = _SM_Manager.refreshSubs()
            strictRenderTfmns = _SM_Transforms.createTransforms(subscribers)
            console.log('SR1', strictRenderTfmns)
            // _SM_ExternalJS.update(strictRenderTfmns)
            _SM_ValueInjector.update(strictRenderTfmns, true)
            _SM_ConstructInjector.update(strictRenderTfmns)
            _SM_EventBinder.update(strictRenderTfmns)
            // Reconcilliation is skipped.
            strictRenderTfmns = _SM_Transforms.update(strictRenderTfmns)
            console.log('SR2',strictRenderTfmns)

            return strictRenderTfmns
        }

        strictRender()



        // @ts-ignore
        this.test_Results.renderMismatch.details = []

        if (this.firstRenderTfmns.length !== strictRenderTfmns.length) {
            console.log('[D]Count of transforms in first and second strict mode render unequal.')
            // @ts-ignore
            this.test_Results.renderMismatch.details.push({ Remark: 'Count mismatch' })
            this.test_Results.renderMismatch.status = 'failed'
            console.log(this.firstRenderTfmns, strictRenderTfmns)

        }
        else {
            let countTfmns = strictRenderTfmns.length
            for (let i = 0; i < countTfmns; i++) {
                let firstHTML = this.firstRenderTfmns[i].mirror.outerHTML
                let secondHTML = strictRenderTfmns[i].mirror.outerHTML

                if (firstHTML !== secondHTML) {
                    console.log('Mismatch in strict mode render transforms : ', firstHTML, secondHTML)
                    this.test_Results.renderMismatch.status = 'failed'
                    // @ts-ignore
                    this.test_Results.renderMismatch.details.push({ firstHTML, secondHTML })
                }
            }

            if (this.test_Results.renderMismatch.status == 'NA') {
                this.test_Results.renderMismatch.status = 'passed'
            }

        }
    }

    /* Checks if any subscriber does not have a corresponding transform.
    Possible when subscribers are dynamically added. */
    static test_InvisibleSubscribers() {

        let subs = document.querySelectorAll('.' + this.subscriberTag)
        let countSubs = subs.length
        let countTfmns = this.firstRenderTfmns.length

        if (countSubs !== countTfmns) {
            console.log('[D]' + (countSubs - countTfmns) + ' are invisible.')
            this.test_Results.invisibleSub.status = 'failed'
            // @ts-ignore
            this.test_Results.invisibleSub.details = 'Differ by ' + (countSubs - countTfmns)
        }
        else {
            this.test_Results.invisibleSub = { status: 'passed' }
        }

    }

    static test_Results = {
        nestedSubscriber: { status: 'NA' },
        unhandledEvents: { status: 'NA' },
        uninitVars: { status: 'NA' },
        renderMismatch: { status: 'NA' },
        noReactivity: { status: 'NA' },
        invisibleSub: { status: 'NA' }
    }


}

document.addEventListener('RenderEvent', () => {
    _SM_Debugger.test_NestedSubscribers()
    _SM_Debugger.test_UnhandledEvents()
    _SM_Debugger.test_UninitializedVars()
    _SM_Debugger.test_InvisibleSubscribers()
    _SM_Debugger.test_NoReactivity()
    
    console.groupCollapsed('%c Test Results:', 'color:red')
    console.table(_SM_Debugger.test_Results, ['status'])
    console.groupCollapsed('Detailed Results - ')
    console.log(_SM_Debugger.test_Results)
    console.groupEnd()
    console.groupEnd()

})


/* 
    The ProxyClient checks for input types and also ensures no deviations in properties
    of an object, which typically indicate common misspellings/wrong function 
    calls (since no typesafety in js) 
*/
class SMDebugClient {

    static SMClient = new StatefulMarkupClient()

    constructor(...args: string[]) {
        console.log("StatefulMarkup Debug Client initialized -v0.1", ...args)
    }

    publish(newEvent: EventDetails) {
        if (SMDebugClient.expectedPropertiesOnly(newEvent,
            ['var', 'val', 'type', 'selector', 'on']))
            SMDebugClient.SMClient.publish(newEvent)
        else console.log('[D]Unexpected Properties in publish arg', newEvent)
    }

    update(variable: string, value: string) {
        if (typeof variable === typeof '' && typeof value === typeof '') {
            SMDebugClient.SMClient.update(variable, value)

            if (typeof _SM_Transforms === typeof Function) {
                // Waits for Transforms/Engine to fully load before trying to access transforms.
                let doesVariableExist = false

                _SM_Transforms.transforms.forEach(tfmn => {
                    let elm = tfmn.element
                    let idx = elm.outerHTML.indexOf(`@${variable}`)
                    if (idx !== -1)
                        doesVariableExist = true
                })

                if (!doesVariableExist) {
                    console.log('[D]Variable does not exist in any subscriber', variable)
                }
            }
        }
        else console.log('[D]Bad Types in update call', variable, typeof value)
    }

    addListener(selector: QuerySelector, onEvent: OnEvent, callback: EventListener, optionalArgs: AddEventListenerOptions) {
        if (typeof selector === typeof '' && typeof onEvent === typeof ''
            && typeof callback === typeof Function && typeof optionalArgs === typeof {}) {
            SMDebugClient.SMClient.addListener(selector, onEvent, callback, optionalArgs)

            let matches = document.querySelector(selector)
            if (matches === null) {
                console.log('[D]No selected element in AddListener', selector)
            }
        }
        else console.log('[D]Bad Types in addListener call')
    }

    addExternalManipulation(selector: QuerySelector, modifier: Function) {
        if (typeof selector === typeof '' && typeof modifier === typeof Function) {
            SMDebugClient.SMClient.addExternalManipulation(selector, modifier)

            let matches = document.querySelector(selector)
            if (matches === null) {
                console.log('[D]No selected element in AddListener', selector)
            }
        }
        else console.log('[D]Bad Types in addExternalManip call')
    }

    static addComponent(cmp: Component) {
        if (this.expectedPropertiesOnly(cmp, ['name', 'template', 'events', 'eventListeners']))
            StatefulMarkupClient.addComponent(cmp)
        else console.log('[D]Unexpected Properties in addComponent call', cmp)
    }

    addPlugins(plugins: Array<PluginDetails>) {
        plugins.forEach(plg => {
            if (SMDebugClient.expectedPropertiesOnly(plg,
                ['name', 'phase', 'saveFn', 'reconcileFn', 'injectionFn'])) {
                SMDebugClient.SMClient.addPlugins([plg])

            }
            else {
                console.log('[D]Unexpected properties in addPlugins', plg)
            }
        })
    }

    currentState(variable: string) {
        if (typeof variable === typeof '') {
            return SMDebugClient.SMClient.currentState(variable)
        }
        else console.log('[D]Bad Types in currentState call', variable)
    }

    /* 
        Checks whether the provided object contains any unexpected keys.
    */
    static expectedPropertiesOnly(obj: Object, expectedKeys: Array<String>) {
        for (const prop in obj) {
            let propExpected = expectedKeys.indexOf(prop) !== -1 ? true : false
            if (!propExpected) {
                return false
            }
        }
        return true
    }
}