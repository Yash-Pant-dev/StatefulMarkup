// const SM = new SMDebugClient('example.js')
const SM = new StatefulMarkupClient('example.js')
StatefulMarkupConfig.DEBUG_LOGS = true


/* Reactivity with @Variable Demo */
variableUpdateFn = (e) => {
    console.log('EBB')
    SM.publish({ type: 'update_p', var: 'Variable', val: e.target.value })
}
SM.addListener('.variableInput', 'input', variableUpdateFn, {})
// Add input field as a reconcilliation target. 
SM.publish({
    type: 'saveState',
    selector: '.variableInput',
    on: 'input-text-plugin',
})
SM.publish({
    var: 'cond-data',
    val: JSON.stringify([
        {
            "name": "Cole Cochran", 
            "text": "Senectus et netus.",
            "age": "18"
        },
        {
            "name": "Graham Brady",
            "text": "Erat volutpat. In condimentum."
        },
        {
            "name": "Sawyer Grimes",
            "text": "Pharetra. Nam ac nulla."
        }
    ])
})

/* Conditionals and Components */
SM.update('AuthStatus', 'false')
authToggleFn = (e) => {
    let curAuthState = SM.currentState('AuthStatus')
    let newAuthState = curAuthState === 'false' ? 'true' : 'false'
    SM.update('AuthStatus', newAuthState)
}
SM.addListener('.auth-toggle', 'click', authToggleFn, {})


// Plugin Demo1: Reconcile
function pluginSaveInputState(evt) {

    let currentState = { on: 'input-text-plugin', selector: evt.selector }
    let selector = evt.selector
    let element = document.querySelector(selector)

    if (element === null)
        return _SM_Log.log(2, 'Save state element not found, selector: ' + selector)

    currentState.wasFocused = (document.activeElement === element) + ''
    currentState.selectionStart = element.selectionStart
    currentState.selectionEnd = element.selectionEnd
    _SM_Reconcilliation.savedStates.push(currentState)
}

function pluginReconcileInputState(save) {
    let element = document.querySelector(save.selector)

    if (element === null)
        return _SM_Log.log(2, 'Cannot find element to reconcile - ' + save.selector)

    if (save.wasFocused === 'true') {
        (element).focus()
    }

    element.setSelectionRange(save.selectionStart, save.selectionEnd)
}

SM.addPlugins([{
    phase: 'Reconcile',
    name: 'input-text-plugin',
    saveFn: pluginSaveInputState,
    reconcileFn: pluginReconcileInputState
}])
// Demo 1 End.


// Plugin Demo-2 : Constructs
function _ifInjection(start, retStart, retEnd) {
    
    const forTagLen = 2 + 9 // @_if-plugin length
    let header = _SM_ConstructInjector.content.substring(start + forTagLen, retStart).trim()
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
        bodyExpansion = _SM_ConstructInjector.content.substring(retStart + 2, retEnd)

    let modifiedContent = _SM_ConstructInjector.content.substring(0, start)
        + bodyExpansion
        + _SM_ConstructInjector.content.substring(retEnd + 2, _SM_ConstructInjector.content.length)

    _SM_ConstructInjector.content = modifiedContent
}

SM.addPlugins([{
    phase: 'Construct',
    name: 'if-plugin',
    injectionFn: _ifInjection
}])
// Demo 2 End.