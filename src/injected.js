// injected.js — runs in the page's MAIN world at document_start.
// Instruments navigator.mediaSession so the DevTools panel can observe, in real
// time, which actions a page has registered, its metadata, playback state, and
// the last position state — and can invoke any registered handler on demand.
(function () {
  "use strict";

  if (!("mediaSession" in navigator)) {
    // No Media Session API in this context; nothing to instrument.
    window.postMessage({ source: "msi-page", type: "unsupported" }, "*");
    return;
  }

  // Guard against double-injection (e.g. extension reload).
  if (window.__msiInstrumented) return;
  window.__msiInstrumented = true;

  var ms = navigator.mediaSession;
  var proto = Object.getPrototypeOf(ms) || ms;

  // Standard + extended action set we care about reporting.
  var ACTIONS = [
    "play",
    "pause",
    "stop",
    "seekbackward",
    "seekforward",
    "seekto",
    "previoustrack",
    "nexttrack",
    "skipad",
    "togglemicrophone",
    "togglecamera",
    "hangup"
  ];

  // Registry of currently-registered handlers, by action name.
  var handlers = Object.create(null);
  // Last position state passed to setPositionState.
  var lastPositionState = null;

  function serializeMetadata() {
    var md;
    try {
      md = ms.metadata;
    } catch (e) {
      md = null;
    }
    if (!md) return null;
    var artwork = [];
    try {
      (md.artwork || []).forEach(function (a) {
        artwork.push({ src: a.src, sizes: a.sizes, type: a.type });
      });
    } catch (e) {}
    return {
      title: md.title,
      artist: md.artist,
      album: md.album,
      artwork: artwork
    };
  }

  function snapshot() {
    var actions = {};
    ACTIONS.forEach(function (a) {
      actions[a] = !!handlers[a];
    });
    var playbackState;
    try {
      playbackState = ms.playbackState;
    } catch (e) {
      playbackState = "none";
    }
    return {
      source: "msi-page",
      type: "state",
      ts: Date.now(),
      url: location.href,
      isTop: window === window.top,
      metadata: serializeMetadata(),
      playbackState: playbackState,
      positionState: lastPositionState,
      actions: actions
    };
  }

  function post() {
    try {
      window.postMessage(snapshot(), "*");
    } catch (e) {}
  }

  // --- Wrap setActionHandler -------------------------------------------------
  var realSetActionHandler = ms.setActionHandler.bind(ms);
  ms.setActionHandler = function (action, handler) {
    var result = realSetActionHandler(action, handler);
    if (handler) {
      handlers[action] = handler;
    } else {
      delete handlers[action];
    }
    post();
    return result;
  };

  // --- Wrap setPositionState -------------------------------------------------
  if (typeof ms.setPositionState === "function") {
    var realSetPositionState = ms.setPositionState.bind(ms);
    ms.setPositionState = function (state) {
      var result = realSetPositionState(state);
      if (state) {
        lastPositionState = {
          duration: state.duration,
          position: state.position,
          playbackRate:
            state.playbackRate === undefined ? 1 : state.playbackRate
        };
      } else {
        lastPositionState = null;
      }
      post();
      return result;
    };
  }

  // --- Wrap metadata + playbackState setters --------------------------------
  function wrapAccessor(name) {
    var desc =
      Object.getOwnPropertyDescriptor(ms, name) ||
      Object.getOwnPropertyDescriptor(proto, name);
    if (!desc || !desc.set || !desc.get) return;
    Object.defineProperty(ms, name, {
      configurable: true,
      enumerable: desc.enumerable,
      get: function () {
        return desc.get.call(ms);
      },
      set: function (v) {
        desc.set.call(ms, v);
        post();
      }
    });
  }
  wrapAccessor("metadata");
  wrapAccessor("playbackState");

  // --- Fire-this-action bridge from the panel -------------------------------
  window.addEventListener("message", function (ev) {
    var data = ev.data;
    if (!data || data.source !== "msi-panel") return;

    if (data.type === "fire") {
      var action = data.action;
      var handler = handlers[action];
      if (typeof handler !== "function") {
        window.postMessage(
          { source: "msi-page", type: "fire-result", action: action, ok: false, reason: "no handler registered" },
          "*"
        );
        return;
      }
      var details = { action: action };
      if (action === "seekforward" || action === "seekbackward") {
        details.seekOffset = data.seekOffset || 10;
      } else if (action === "seekto") {
        details.seekTime = data.seekTime || 0;
        details.fastSeek = !!data.fastSeek;
      }
      try {
        handler(details);
        window.postMessage(
          { source: "msi-page", type: "fire-result", action: action, ok: true },
          "*"
        );
      } catch (err) {
        window.postMessage(
          { source: "msi-page", type: "fire-result", action: action, ok: false, reason: String(err) },
          "*"
        );
      }
    } else if (data.type === "request-state") {
      post();
    }
  });

  // Emit an initial snapshot so a panel opened later still sees current state.
  post();
})();
