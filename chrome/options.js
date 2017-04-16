const dateFormat_k = 'MMM d, yyyy';
const dueShortcuts_k = 'Tomorrow morning day=+1 hour=8:00am';

// Saves options to localStorage.
function save_options() {
  var debugMode = document.getElementById("debugmode").checked;
  var dateFormat = document.getElementById("dateformat").value;
  var dueShortcuts = document.getElementById("dueshortcuts").value;

  chrome.storage.sync.set({'debugMode': debugMode, 'dateFormat': dateFormat, 'dueShortcuts': dueShortcuts}, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById("status");
    status.innerHTML = "Options Saved.";
    setTimeout(function() {
      status.innerHTML = "&nbsp;";
    }, 2500);
  });
}

// Returns dateformat to default:
function default_dateformat() {
  document.getElementById("dateformat").value = dateFormat_k;
}

// Returns dueshortcuts to default:
function default_dueshortcuts() {
  document.getElementById("dueshortcuts").value = "Due shortcuts";
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  chrome.storage.sync.get(['debugMode', 'dateFormat', 'dueShortcuts'], function(response) {
    document.getElementById("debugmode").checked = response.debugMode || false;
    document.getElementById("dateformat").value = response.dateFormat || dateFormat_k;
    document.getElementById("dueshortcuts").value = response.dueShortcuts || "Due shortcuts";
  });  
}

document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);
document.querySelector('#default-dateformat').addEventListener('click', default_dateformat);
document.querySelector('#default-dueshortcuts').addEventListener('click', default_dueshortcuts);