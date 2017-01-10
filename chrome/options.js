var settings = {};

// Saves options to localStorage.
function save_options() {
  settings.debugMode = document.getElementById("debugmode").checked;
  settings.dateFormat = document.getElementById("dateformat").value;
  localStorage["userSettings"] = JSON.stringify(settings);

  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "&nbsp;";
  }, 1500);
}

// Returns dateformat to default:
function default_options() {
  document.getElementById("dateformat").value = "MMM d, yyyy";
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  var settingsJson = localStorage["userSettings"];

  if (!settingsJson) {
    return;
  }

  settings = JSON.parse(settingsJson);

  if (settings.hasOwnProperty("debugMode")) {
    document.getElementById("debugmode").checked = settings.debugMode;
  }

  if (settings.hasOwnProperty("dateFormat")) {
    document.getElementById("dateformat").value = settings.dateFormat;
  }

}

document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);
document.querySelector('#default').addEventListener('click', default_options);