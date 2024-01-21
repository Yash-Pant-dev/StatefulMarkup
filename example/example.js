const SM = new StatefulMarkupClient('example.js')
StatefulMarkupConfig.DEBUG_LOGS = true

/* Reactivity with @Suffix Demo */
suffixUpdateFn = (e) => {
    SM.publish({ type: 'update_p', var: 'Suffix', val: e.target.value })
}
SM.addListener('.suffixInput', 'input', suffixUpdateFn, {})
// Add input field as a reconcilliation target. 
SM.publish({
    type: 'saveState',
    selector: '.suffixInput',
    on: 'input-text',
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
    console.log('auth tog fn')
    let curAuthState = SM.currentState('AuthStatus')
    let newAuthState = curAuthState === 'false' ? 'true' : 'false'
    SM.update('AuthStatus', newAuthState)
    console.log(newAuthState, curAuthState === 'false')
}
SM.addListener('.auth-toggle', 'click', authToggleFn, {})