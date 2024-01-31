const FooterComponent = {
    name: 'footer',
    template: `
    <div id="footer" class="p-3 border border-success-subtle m-2">
    Authored By: @ypname
    <br>
    Click Here!
    </div>
    `,
    eventListeners: [{
        selector: '#footer', onEvent: 'click', callback: () => {
            alert('Footer was clicked!')
        }
    }],
    events: [{ var: 'ypname', val: 'Yash Pant' }]
}

StatefulMarkupClient.registerComponent(FooterComponent)