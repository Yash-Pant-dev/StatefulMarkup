const StatefulMarkup = new StatefulMarkupClient("Example.js")

function fetchName() {
    setTimeout(() => {
        StatefulMarkup.publish({var: "name", val: "Yash"})
    }, 50)
    setTimeout(() => {
        StatefulMarkup.publish({var: "gender", val: "male"})
    }, 150)
}

fetchName()
