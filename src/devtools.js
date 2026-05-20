// devtools.js — registers the "MediaSession" panel in DevTools.
"use strict";

chrome.devtools.panels.create(
  "MediaSession",
  "",
  "panel.html",
  function (panel) {
    // Panel created; panel.html drives the rest.
  }
);
