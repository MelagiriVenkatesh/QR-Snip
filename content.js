// This function ensures the script doesn't run multiple times on the same page.
(() => {
  if (document.getElementById('qr-scanner-overlay')) {
    return;
  }

  let startX, startY;

  // 1. Create the overlay
  const overlay = document.createElement('div');
  overlay.id = 'qr-scanner-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: '9999998',
    cursor: 'crosshair'
  });
  document.body.appendChild(overlay);

  // 2. Create the selection box
  const selectionBox = document.createElement('div');
  selectionBox.id = 'qr-scanner-selection-box';
  Object.assign(selectionBox.style, {
    position: 'fixed',
    border: '2px dashed #fff',
    background: 'rgba(255, 255, 255, 0.2)',
    zIndex: '9999999',
    display: 'none' // Hidden until the user starts dragging
  });
  document.body.appendChild(selectionBox);

  // 3. Add mouse event listeners
  overlay.addEventListener('mousedown', onMouseDown);

  function onMouseDown(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;

    // Set the initial position and size of the selection box
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';

    // Listen for mouse movement and release
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    const currentX = e.clientX;
    const currentY = e.clientY;

    // Calculate the width and height of the box
    const width = currentX - startX;
    const height = currentY - startY;

    // Update the box dimensions and position
    selectionBox.style.width = `${Math.abs(width)}px`;
    selectionBox.style.height = `${Math.abs(height)}px`;
    selectionBox.style.left = `${(width > 0) ? startX : currentX}px`;
    selectionBox.style.top = `${(height > 0) ? startY : currentY}px`;
  }

  function onMouseUp(e) {
    // Stop listening to mouse events
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    // Get the final dimensions of the selection box
    const rect = selectionBox.getBoundingClientRect();

    // Clean up the UI by removing the overlay and box
    overlay.remove();
    selectionBox.remove();

    // Only send the message if the selection is a reasonable size
    if (rect.width > 10 && rect.height > 10) {
      chrome.runtime.sendMessage({
        type: 'capture',
        area: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        }
      });
    }
  }
})();