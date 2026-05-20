// background.js — service worker. Relays messages between content scripts
// (keyed by tab id) and the DevTools panels that are inspecting those tabs.
"use strict";

// Map of tabId -> panel port.
var panelPorts = new Map();

// Panel connects with name "msi-panel:<tabId>".
chrome.runtime.onConnect.addListener(function (port) {
  var match = /^msi-panel:(\d+)$/.exec(port.name || "");
  if (!match) return;
  var tabId = parseInt(match[1], 10);
  panelPorts.set(tabId, port);

  port.onMessage.addListener(function (msg) {
    if (!msg) return;
    // Panel asks us to forward a command to its inspected tab.
    if (msg.source === "msi-panel") {
      try {
        chrome.tabs.sendMessage(tabId, msg);
      } catch (e) {}
    }
  });

  port.onDisconnect.addListener(function () {
    if (panelPorts.get(tabId) === port) panelPorts.delete(tabId);
  });
});

// Content script -> background: forward page state to the matching panel.
chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (!msg || msg.source !== "msi-page") return;
  var tabId = sender && sender.tab && sender.tab.id;
  if (tabId == null) return;
  var port = panelPorts.get(tabId);
  if (port) {
    try {
      // Tag with frame info so the panel can distinguish top vs. subframes.
      msg.frameId = sender.frameId;
      port.postMessage(msg);
    } catch (e) {
      panelPorts.delete(tabId);
    }
  }
});
