// Saves options to localStorage.
function save_options() {
  var debugMode = document.getElementById("debugmode").checked;
  var dateFormat = document.getElementById("dateformat").value;

  chrome.storage.sync.set({'debugMode': debugMode, 'dateFormat': dateFormat}, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById("status");
    status.innerHTML = "Options Saved.";
    setTimeout(function() {
      status.innerHTML = "&nbsp;";
    }, 1500);
  });
}

// Returns dateformat to default:
function default_options() {
  document.getElementById("dateformat").value = "MMM d, yyyy";
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  chrome.storage.sync.get(['debugMode', 'dateFormat'], function(response) {
    document.getElementById("debugmode").checked = response.debugMode || false;
    document.getElementById("dateformat").value = response.dateFormat || 'MMM d, yyyy';
  });  
}

document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);
document.querySelector('#default').addEventListener('click', default_options);