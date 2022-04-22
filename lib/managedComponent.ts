import { MCClient } from './client'
import { Manager } from './index'

export const EVENT_SPACER = '::'

export abstract class ManagedComponent {
  manager: Manager
  namespace: string
  client?: MCClient
  settings: any
  abstract clientCreated(): void

  constructor(manager: Manager, namespace: string, settings: any = {}) {
    this.manager = manager
    this.namespace = namespace
    this.settings = settings
  }

  setClient(client: MCClient) {
    this.client = client
    this.clientCreated && this.clientCreated()
  }

  addEventListener(
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) {
    if (!this.manager.requiredSnippets.includes(type)) {
      this.manager.requiredSnippets.push(type)
    }
    const eventName = `${this.namespace}${EVENT_SPACER}${type}`
    this.client?.addEventListener(eventName, listener, options)
  }
}
