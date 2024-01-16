const StatefulMarkup = new StatefulMarkupClient("example.js")
StatefulMarkupConfig.DEBUG_LOGS = true

suffixUpdateFn = (e) => {
    StatefulMarkup.update("Suffix", e.target.value)
    StatefulMarkup.publish({
        type: 'saveState',
        selector: '.suffixInput',
        on: 'input',
    })
}

// setInterval(() => {
//     console.log('EJS - ', document.activeElement.outerHTML)
// }, 1000)

StatefulMarkup.addListener(".suffixInput", "input", suffixUpdateFn, {})

// let lastActiveElement
// document.addEventListener('focusin', event => {
//     lastActiveElement = event.target
//     console.log("lasAE", lastActiveElement)
// })

// document.addEventListener('RenderEvent', () => {

//     let inp = document.querySelector('.suffixInput')
//     let docEle = document.createElement('newEle')
//     docEle.append(lastActiveElement)
//     let oldFocus = docEle.querySelector('.suffixInput')
//     if (oldFocus) {
//         inp.focus()
//         inp.setSelectionRange(inp.selectionStart, inp.selectionEnd)
//     }
// })



/* 
    After render reconcilliation - 
    Input field: 
    If focused - 
        focus
    
*/