/* Type declarations for Stateful Markup */

/* StatefulMarkupClient */
type Id = number
type QuerySelector = string

interface SMEvent {
    id: Id,
    event: EventDetails
}

interface EventDetails {
    readonly [index: string]: string | undefined
}

type SMListener = {id: Id} & ListenerDetails
interface ListenerDetails {
    selector: QuerySelector,
    onEvent: OnEvent,
    callback: EventListener,
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