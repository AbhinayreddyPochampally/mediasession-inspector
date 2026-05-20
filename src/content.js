// content.js — runs in the ISOLATED world. Bridges the page (MAIN-world
// injected.js, via window.postMessage) and the extension service worker
// (via chrome.runtime messaging).
(function () {
  "use strict";

  // Page -> background: forward Media Session state and fire results.
  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    var data = ev.data;
    if (!data || data.source !== "msi-page") return;
    try {
      chrome.runtime.sendMessage(data);
    } catch (e) {
      // Service worker may be asleep / context invalidated; ignore.
    }
  });

  // Background -> page: forward panel commands (fire action, request state).
  chrome.runtime.onMessage.addListener(function (msg) {
    if (!msg || msg.source !== "msi-panel") return;
    window.postMessage(msg, "*");
  });
})();
