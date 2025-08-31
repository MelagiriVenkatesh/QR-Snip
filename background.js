// background.js

// Import the QR code scanning library.
importScripts('jsQR.js');

// Listen for a click on the extension's icon in the toolbar.
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});

// Listen for messages from the content script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'capture') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
      if (!dataUrl) {
        console.error("Failed to capture tab.");
        return;
      }
      try {
        // Step 1: Fetch the data URL and convert it to a blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        // Step 2: Use createImageBitmap to decode the image blob
        // This is the modern, worker-safe way to handle images.
        const imageBitmap = await createImageBitmap(blob);

        // Step 3: Use OffscreenCanvas to draw and get image data
        // This is a canvas that works without a visible webpage.
        const canvas = new OffscreenCanvas(message.area.width, message.area.height);
        const ctx = canvas.getContext('2d');

        // Step 4: Draw the selected part of the image onto the canvas
        ctx.drawImage(imageBitmap, message.area.x, message.area.y, message.area.width, message.area.height, 0, 0, message.area.width, message.area.height);

        // Step 5: Get the pixel data from the canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Step 6: Scan the image data for a QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleQRCodeResult(code.data, sender.tab.id);
        } else {
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: () => { alert('No QR code found in the selected area.'); }
          });
        }
      } catch (e) {
        console.error("Error processing image:", e);
      }
    });
  }
  return true; // Keep the message channel open for async response
});

/**
 * Handles the decoded QR code data.
 * @param {string} data - The decoded data from the QR code.
 * @param {number} tabId - The ID of the tab where the action originated.
 */
function handleQRCodeResult(data, tabId) {
  if (data.startsWith('http://') || data.startsWith('https://')) {
    chrome.tabs.create({ url: data });
  } else {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (textToCopy) => {
        navigator.clipboard.writeText(textToCopy)
          .then(() => {
            alert(`QR Code Content:\n\n${textToCopy}\n\n(Copied to clipboard)`);
          })
          .catch(err => {
            console.error('Failed to copy text: ', err);
            alert(`QR Code Content:\n\n${textToCopy}`);
          });
      },
      args: [data]
    });
  }
}