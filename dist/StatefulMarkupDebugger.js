class _SM_Debugger {
    /* SM does not allow nesting subscribers classes in the DOM tree. */
    static test_NestedSubscribers() {
        let matches = Array.from(document.querySelectorAll('.' + this.subscriberTag + ' ' + '.' + this.subscriberTag));
        if (matches.length === 0) {
            this.test_Results.nestedSubscriber = { status: 'passed' };
            return;
        }
        // @ts-ignore
        this.test_Results.nestedSubscriber = { status: 'failed', details: matches };
        console.log('%c Debugger');
    }
    // Events that are not handled.
    static test_UnhandledEvents() {
        if (!_SM_Manager.events.length) {
            this.test_Results.unhandledEvents = { status: 'passed' };
            return;
        }
        // @ts-ignore
        this.test_Results.unhandledEvents = { status: 'failed', details: _SM_Manager.events };
    }
    // Variables that are uninitialized. Can lead to false positives, such as an email address.
    static test_UninitializedVars() {
        let matches = Array.from(document.querySelectorAll('.' + this.subscriberTag));
        let offendingElements = [];
        matches.forEach(sub => {
            let idx = sub.outerHTML.indexOf('@');
            if (idx !== -1) {
                offendingElements.push({
                    idx,
                    sub
                });
            }
        });
        if (!offendingElements.length) {
            this.test_Results.uninitVars = { status: 'passed' };
            return;
        }
        // @ts-ignore
        this.test_Results.uninitVars = { status: 'failed', details: offendingElements };
    }
    // Tests for subscribers with no reactive element. May be ok if you plan to later
    // add reactivity through external stateless manipulation.
    static test_NoReactivity() {
        let offendingElements = [];
        _SM_Transforms.transforms.forEach(tfmn => {
            let idx = tfmn.element.outerHTML.indexOf('@');
            if (idx === -1) {
                offendingElements.push({
                    idx,
                    element: tfmn.element
                });
            }
        });
    }
    static VerboseLogging(logInterval) {
        let id = setInterval(() => {
            console.groupCollapsed("StatefulMarkup Logs - t elapsed:", (Date.now() - this.INIT_TIME) / 1000);
            console.groupCollapsed("PubSub");
            console.log(StatefulMarkupClient.eventsBuffer);
            console.log(StatefulMarkupClient.eventListeners);
            console.log(StatefulMarkupClient.statelessUpdates);
            console.groupEnd();
            if (typeof _SM_Engine !== undefined) {
                console.groupCollapsed("Engine");
                console.log(_SM_Transforms.transforms);
                console.log(_SM_ValueInjector._getMapping());
                console.groupEnd();
                console.groupCollapsed("Renderer");
                console.log(_SM_Engine.rendererIntrinsics);
                console.log(_SM_Engine._observedOperations);
                console.groupEnd();
            }
            console.groupEnd();
        }, logInterval !== null && logInterval !== void 0 ? logInterval : 10);
        return id;
    }
}
_SM_Debugger.subscriberTag = '_sm'; //typically _sm
_SM_Debugger.INIT_TIME = Date.now();
// Checks if any function has been passed any invalid argument.
// static test_InvalidParameters() {
// }
_SM_Debugger.test_Results = {
    nestedSubscriber: { status: 'NA' },
    unhandledEvents: { status: 'NA' },
    uninitVars: { status: 'NA' },
};
document.addEventListener('RenderEvent', () => {
    _SM_Debugger.test_UnhandledEvents();
    _SM_Debugger.test_UninitializedVars();
    console.log('Test Results:', _SM_Debugger.test_Results);
});
/*
    The ProxyClient checks for input types and also ensures no deviations in properties
    of an object, which typically indicate common misspellings/wrong function
    calls (since no typesafety in js)
*/
class _SMDebugProxyClient {
    constructor(...args) {
        console.log("StatefulMarkup Debug Client initialized -v0.1", ...args);
    }
    publish(newEvent) {
        if (_SMDebugProxyClient.expectedPropertiesOnly(newEvent, ['var', 'val', 'type', 'selector', 'on']))
            _SMDebugProxyClient.SMClient.publish(newEvent);
        else
            console.log('[D]Unexpected Properties in publish arg', newEvent);
    }
    update(variable, value) {
        if (typeof variable === typeof '' && typeof value === typeof '') {
            _SMDebugProxyClient.SMClient.update(variable, value);
            if (typeof _SM_Transforms === typeof Function) {
                // Waits for Transforms/Engine to fully load before trying to access transforms.
                let doesVariableExist = false;
                _SM_Transforms.transforms.forEach(tfmn => {
                    let elm = tfmn.element;
                    let idx = elm.outerHTML.indexOf(`@${variable}`);
                    if (idx !== -1)
                        doesVariableExist = true;
                });
                if (!doesVariableExist) {
                    console.log('[D]Variable does not exist in any subscriber', variable);
                }
            }
        }
        else
            console.log('[D]Bad Types in update call', variable, typeof value);
    }
    addListener(selector, onEvent, callback, optionalArgs) {
        if (typeof selector === typeof '' && typeof onEvent === typeof ''
            && typeof callback === typeof Function && typeof optionalArgs === typeof {}) {
            _SMDebugProxyClient.SMClient.addListener(selector, onEvent, callback, optionalArgs);
            let matches = document.querySelector(selector);
            if (matches === null) {
                console.log('[D]No selected element in AddListener', selector);
            }
        }
        else
            console.log('[D]Bad Types in addListener call');
    }
    addExternalManipulation(selector, modifier) {
        if (typeof selector === typeof '' && typeof modifier === typeof Function) {
            _SMDebugProxyClient.SMClient.addExternalManipulation(selector, modifier);
            let matches = document.querySelector(selector);
            if (matches === null) {
                console.log('[D]No selected element in AddListener', selector);
            }
        }
        else
            console.log('[D]Bad Types in addExternalManip call');
    }
    static addComponent(cmp) {
        if (this.expectedPropertiesOnly(cmp, ['name', 'template', 'events', 'eventListeners']))
            StatefulMarkupClient.addComponent(cmp);
        else
            console.log('[D]Unexpected Properties in addComponent call', cmp);
    }
    addPlugins(plugins) {
        plugins.forEach(plg => {
            if (_SMDebugProxyClient.expectedPropertiesOnly(plg, ['name', 'phase', 'saveFn', 'reconcileFn', 'injectionFn'])) {
                _SMDebugProxyClient.SMClient.addPlugins([plg]);
            }
            else {
                console.log('[D]Unexpected properties in addPlugins', plg);
            }
        });
    }
    currentState(variable) {
        if (typeof variable === typeof '') {
            return _SMDebugProxyClient.SMClient.currentState(variable);
        }
        else
            console.log('[D]Bad Types in currentState call', variable);
    }
    /*
        Checks whether the provided object contains any unexpected keys.
    */
    static expectedPropertiesOnly(obj, expectedKeys) {
        for (const prop in obj) {
            let propExpected = expectedKeys.indexOf(prop) !== -1 ? true : false;
            if (!propExpected) {
                return false;
            }
        }
        return true;
    }
}
_SMDebugProxyClient.SMClient = new StatefulMarkupClient();
