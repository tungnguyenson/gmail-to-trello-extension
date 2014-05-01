var settings = {};

// Saves options to localStorage.
function save_options() {
  settings.debugMode = document.getElementById("chk-debug").checked;
  localStorage["userSettings"] = JSON.stringify(settings);

  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 750);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  var settingsJson = localStorage["userSettings"];

  if (!settingsJson) {
    return;
  }

  settings = JSON.parse(settingsJson);

  if (settings.hasOwnProperty("debugMode"));
    document.getElementById("chk-debug").checked = settings.debugMode;

}

document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);