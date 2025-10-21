export class ActionsBarManager {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.target
   * @param {EventBus} opts.eventBus
   * @param {Array<Function>} [opts.actions] - constructors/factories
   */
  constructor({ target, eventBus }) {
    this.eventBus = eventBus
    this.el = target
    this._actions = []
  }

  registerAction(buttonId, callback) {
    const button = this.el.querySelector(`#${buttonId}`);
    if (button) {
      button.addEventListener('click', callback);
      this._actions.push({ id: buttonId, callback });
    } else {
      console.warn(`[ActionsBarManager] Button with ID '${buttonId}' not found in target element.`);
    }
  }

  get actions() { return this._actions.slice() }
}
export default ActionsBarManager
