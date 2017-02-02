var pageMod = require("sdk/page-mod");
var self = require("sdk/self");

pageMod.PageMod({
    include: "https://mail.google.com/mail*",
    contentScriptWhen: 'end',
    contentScriptFile: [
        "./lib/jquery.min.js",
        "./lib/jquery-ui.min.js",
        "./lib/jquery.datetimepicker.js",
        "./lib/trello.min.js",
        "./lib/date.js",
        "./lib/eventTarget.js",
        "./lib/menuControl.js",
        "./lib/waitCounter.js",
        "./views/gmailView.js",
        "./views/popupView.js",
        "./model.js",
        "./app.js",
        "./content-script.js",
    ],
    contentScriptOptions: {
        urlprefix: self.data.url("REPLACEME").replace("REPLACEME", '')
    },
    contentStyleFile: [
        "./style.css",
        "./lib/jquery.datetimepicker.css"
    ],
    attachTo: ["existing", "top"]
})

/* Manage storage between ext & content script
*/
