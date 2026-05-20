// panel.js — drives the MediaSession DevTools panel UI.
"use strict";

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

var tabId = chrome.devtools.inspectedWindow.tabId;
var port = chrome.runtime.connect({ name: "msi-panel:" + tabId });

var els = {
  status: document.getElementById("status"),
  playbackState: document.getElementById("playbackState"),
  metadata: document.getElementById("metadata"),
  positionState: document.getElementById("positionState"),
  actions: document.getElementById("actions"),
  log: document.getElementById("log")
};

// Build the action rows once.
var actionRows = {};
ACTIONS.forEach(function (action) {
  var tr = document.createElement("tr");

  var tdDot = document.createElement("td");
  var dot = document.createElement("span");
  dot.className = "dot off";
  dot.textContent = "●";
  tdDot.appendChild(dot);

  var tdName = document.createElement("td");
  tdName.className = "action-name";
  tdName.textContent = action;

  var tdBtn = document.createElement("td");
  var btn = document.createElement("button");
  btn.textContent = "Fire";
  btn.disabled = true;
  btn.addEventListener("click", function () {
    fire(action);
  });
  tdBtn.appendChild(btn);

  tr.appendChild(tdDot);
  tr.appendChild(tdName);
  tr.appendChild(tdBtn);
  els.actions.appendChild(tr);

  actionRows[action] = { dot: dot, btn: btn };
});

function fire(action) {
  log("→ fire " + action);
  port.postMessage({ source: "msi-panel", type: "fire", action: action });
}

function log(line) {
  var t = new Date().toLocaleTimeString();
  els.log.textContent = "[" + t + "] " + line + "\n" + els.log.textContent;
}

function escapeText(s) {
  return s == null ? "" : String(s);
}

function renderMetadata(md) {
  if (!md) {
    els.metadata.innerHTML = '<span class="empty">No metadata set.</span>';
    return;
  }
  var dl = document.createElement("dl");
  dl.className = "kv";
  [["Title", md.title], ["Artist", md.artist], ["Album", md.album]].forEach(
    function (row) {
      var dt = document.createElement("dt");
      dt.textContent = row[0];
      var dd = document.createElement("dd");
      dd.textContent = escapeText(row[1]) || "—";
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
  );
  els.metadata.innerHTML = "";
  els.metadata.appendChild(dl);

  if (md.artwork && md.artwork.length) {
    var wrap = document.createElement("div");
    wrap.className = "art";
    md.artwork.forEach(function (a) {
      var img = document.createElement("img");
      img.src = a.src;
      img.title = (a.sizes || "") + " " + (a.type || "");
      img.referrerPolicy = "no-referrer";
      img.onerror = function () {
        img.style.display = "none";
      };
      wrap.appendChild(img);
    });
    els.metadata.appendChild(wrap);
  }
}

function renderPositionState(ps) {
  if (!ps) {
    els.positionState.innerHTML =
      '<span class="empty">setPositionState() not called.</span>';
    return;
  }
  var dl = document.createElement("dl");
  dl.className = "kv";
  var rows = [
    ["Duration", fmtSeconds(ps.duration)],
    ["Position", fmtSeconds(ps.position)],
    ["Rate", ps.playbackRate + "×"]
  ];
  rows.forEach(function (row) {
    var dt = document.createElement("dt");
    dt.textContent = row[0];
    var dd = document.createElement("dd");
    dd.textContent = row[1];
    dl.appendChild(dt);
    dl.appendChild(dd);
  });
  els.positionState.innerHTML = "";
  els.positionState.appendChild(dl);
}

function fmtSeconds(n) {
  if (n == null || isNaN(n)) return "—";
  if (n === Infinity) return "∞ (live)";
  var m = Math.floor(n / 60);
  var s = Math.floor(n % 60);
  return m + ":" + (s < 10 ? "0" : "") + s + " (" + n.toFixed(1) + "s)";
}

function render(state) {
  els.status.textContent =
    "live · updated " + new Date(state.ts).toLocaleTimeString();
  els.playbackState.textContent = state.playbackState || "none";
  renderMetadata(state.metadata);
  renderPositionState(state.positionState);
  ACTIONS.forEach(function (action) {
    var registered = !!(state.actions && state.actions[action]);
    var row = actionRows[action];
    row.dot.className = "dot " + (registered ? "on" : "off");
    row.btn.disabled = !registered;
  });
}

port.onMessage.addListener(function (msg) {
  if (!msg || msg.source !== "msi-page") return;
  if (msg.type === "state") {
    // Only render top-frame state to keep the panel focused; log subframes.
    if (msg.isTop) {
      render(msg);
    }
  } else if (msg.type === "fire-result") {
    log(
      "← " +
        msg.action +
        ": " +
        (msg.ok ? "ok" : "failed — " + (msg.reason || "unknown"))
    );
  } else if (msg.type === "unsupported") {
    els.status.textContent = "Media Session API not present in this context";
  }
});

// Ask the page for a fresh snapshot when the panel opens.
port.postMessage({ source: "msi-panel", type: "request-state" });
log("panel connected to tab " + tabId);
