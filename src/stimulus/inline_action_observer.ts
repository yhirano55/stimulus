import { Action } from "./action"
import { Descriptor } from "./descriptor"
import { AttributeObserver, AttributeObserverDelegate } from "sentinella"

export interface InlineActionObserverDelegate {
  getObjectForInlineActionDescriptor(descriptor: Descriptor): object
  inlineActionConnected(action: Action)
  inlineActionDisconnected(action: Action)
  canControlElement(element: Element)
}

export class InlineActionObserver implements AttributeObserverDelegate {
  identifier: string
  private delegate: InlineActionObserverDelegate

  private attributeObserver: AttributeObserver
  private connectedActions: Map<Element, Action>

  constructor(identifier: string, element: Element, delegate: InlineActionObserverDelegate) {
    this.identifier = identifier
    this.delegate = delegate

    this.attributeObserver = new AttributeObserver(element, this.attributeName, this)
    this.connectedActions = new Map<Element, Action>()
  }

  get element(): Element {
    return this.attributeObserver.element
  }

  get attributeName(): string {
    return `data-${this.identifier}-action`
  }

  start() {
    this.attributeObserver.start()
  }

  stop() {
    this.attributeObserver.stop()
  }

  // Attribute observer delegate

  elementMatchedAttribute(element: Element, attributeName: string) {
    if (this.delegate.canControlElement(element)) {
      this.refreshActionForElement(element)
    }
  }

  elementAttributeValueChanged(element: Element, attributeName: string) {
    if (this.delegate.canControlElement(element)) {
      this.refreshActionForElement(element)
    }
  }

  elementUnmatchedAttribute(element: Element, attributeName: string) {
    this.disconnectActionForElement(element)
  }

  // Connected actions

  private refreshActionForElement(element: Element) {
    const descriptorString = element.getAttribute(this.attributeName)
    if (descriptorString == null) {
      this.disconnectActionForElement(element)
    } else {
      const newAction = this.buildActionForElementWithDescriptorString(element, descriptorString)
      const existingAction = this.getActionForElement(element)
      if (!newAction.isEqualTo(existingAction)) {
        this.disconnectActionForElement(element)
        this.connectActionForElement(newAction, element)
      }
    }
  }

  private connectActionForElement(action: Action, element: Element) {
    this.connectedActions.set(element, action)
    this.delegate.inlineActionConnected(action)
  }

  private disconnectActionForElement(element: Element) {
    const action = this.getActionForElement(element)
    if (action) {
      this.connectedActions.delete(element)
      this.delegate.inlineActionDisconnected(action)
    }
  }

  private getActionForElement(element: Element): Action | undefined {
    return this.connectedActions.get(element)
  }

  private buildActionForElementWithDescriptorString(element: Element, descriptorString: string) {
    const descriptor = Descriptor.parse(descriptorString)
    const object = this.delegate.getObjectForInlineActionDescriptor(descriptor)
    return new Action(object, this.element, element, descriptor)
  }
}