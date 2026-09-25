/**
 * mg-dialog: optional JS tier.
 *
 * The component needs no JS in current browsers: <dialog> is native, and Invoker Commands
 * (<button command="show-modal" commandfor="id">) and `closedby` open, close and light-dismiss it.
 * This script only fills those two gaps in older browsers, and does nothing where they exist.
 * It is one delegated listener on the document, so it needs no upgrade step and also works for
 * dialogs Drupal inserts later (AJAX, BigPipe).
 */
(() => {
  const hasInvokerCommands = 'commandForElement' in HTMLButtonElement.prototype;
  const hasClosedBy = 'closedBy' in HTMLDialogElement.prototype;

  const onInvokerClick = (event) => {
    const button = event.target instanceof Element ? event.target.closest('button[command][commandfor]') : null;
    if (!button || button.disabled) return;

    const dialog = document.getElementById(button.getAttribute('commandfor'));
    if (!(dialog instanceof HTMLDialogElement)) return;

    switch (button.getAttribute('command')) {
      case 'show-modal':
        if (!dialog.open) dialog.showModal();
        break;
      case 'close':
      case 'request-close':
        dialog.close();
        break;
    }
  };

  // A click on the ::backdrop is dispatched on the <dialog> itself, outside its box.
  const onBackdropClick = (event) => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLDialogElement) || !dialog.open || dialog.getAttribute('closedby') !== 'any') return;

    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) dialog.close();
  };

  if (!hasInvokerCommands) document.addEventListener('click', onInvokerClick);
  if (!hasClosedBy) document.addEventListener('click', onBackdropClick);
})();
