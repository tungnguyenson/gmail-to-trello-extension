/***
 * This function is injected into the page for the content-script to receive information
 */
setTimeout (function() {
  var userEmail = "?";
  if (typeof GLOBALS !== "undefined") {
         userEmail = GLOBALS[10];
  } else if (typeof (window) !== "undefined" && window.opener !== null && typeof window.opener.GLOBALS !== "undefined") {
         userEmail = window.opener.GLOBALS[10];
  };
  var GTT_event = new CustomEvent ('gtt:connect_extension', { 'detail': { 'userEmail': userEmail } });
  document.dispatchEvent(GTT_event);
}, 0);