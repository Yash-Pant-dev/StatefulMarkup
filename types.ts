/* Type declarations for Stateful Markup */

/* StatefulMarkupClient */
type Id = number
type QuerySelector = string

interface SMEvent {
    id: Id,
    event: EventDetails
}

interface EventDetails {
    readonly [index: string]: string
}

interface ReconcilliationEvent {
    [index: string]: string
}

interface RecTarget {
    [key: string]: string
}

type SMListener = {id: Id} & ListenerDetails
interface ListenerDetails {
    selector: QuerySelector,
    onEvent: OnEvent,
    callback: (this: Element, ev: Event) => any,
    optionalArgs: AddEventListenerOptions
}
type OnEvent = keyof ElementEventMap

type SMExterns = {id: Id} & ExternDetails
interface ExternDetails {
    selector: QuerySelector,
    modifier: Function
}

/* StatefulMarkup */
type SMSubscriber = Element

interface SMTransform {
    id?: Id
    element: Element,
    mirror: Element,
    shard: Element | null,
}

type SMOperation = 'Sless' | 'EvBind' | 'Pub'

interface PersistingVars {
    var: string,
    val: string
}

interface JSONObj {
    [idx: string]: any
}

interface Component {
    name: string
    template: string,
    events: Array<EventDetails>
    eventListeners: Array<ListenerDetails>
}