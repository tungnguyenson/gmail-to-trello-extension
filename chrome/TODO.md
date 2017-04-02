- [done] When popup is appeared, remember last choice
- [done] Link back to Gmail, can search
- [done] Detect most visible thread on screen
- [done] refactor
- [done] Check valid gmail's event (email thread mode)
- [done] attachments
- [done] add due date
- [done] Include "From <email> to Description"
- validate textbox data (empty state)
- Add email body to comments
- Fix bug: Stop detecting & parsing after user changed form's data

- Add attachments as files instead of links: https://github.com/KartikTalwar/gmail.js/issues/134
 
KartikTalwar commented on Jan 10, 2015
@PANCAKES so turns out that fetching attachments follows a nice convention:

https://mail.google.com/mail/u/0/?ui=2&ik={ik_value}&view=att&th={message_id}&attid=0.{atachment_index}&disp=safe&zw

attachmment_index is just the index of the attachment. If there are 3 attachments and you want to get the 3rd file, the index value will be 3. This URL is a 302 header that acts like a link shortener for the download file. Opening this link will lead you to the attachment data

var ik = gmail.tracker.ik;
var id = gmail.get.email_id();
var aid = "1"; // gets the first attachment

var url = "https://mail.google.com/mail/u/0/?ui=2&ik=" + ik + "&view=att&th=" + id + "&attid=0." + aid + "&disp=safe&zw";

console.log(url);

http://stackoverflow.com/questions/2897619/using-html5-javascript-to-generate-and-save-a-file

js:
data = [];
data.push("This is a test\n");
data.push("Of creating a file\n");
data.push("In a browser\n");
properties = {type: 'plain/text'}; // Specify the file's mime-type.
try {
  // Specify the filename using the File constructor, but ...
  file = new File(data, "file.txt", properties);
} catch (e) {
  // ... fall back to the Blob constructor if that isn't supported.
  file = new Blob(data, properties);
}
url = URL.createObjectURL(file);
document.getElementById('link').href = url;

html:
<a id="link" target="_blank" download="file.txt">Download</a>

js:
function download(content, filename, contentType)
{
    if(!contentType) contentType = 'application/octet-stream';
        var a = document.createElement('a');
        var blob = new Blob([content], {'type':contentType});
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        a.click();
}

var a = window.document.createElement('a');
a.href = window.URL.createObjectURL(new Blob(['Test,Text'], {type: 'text/csv'}));
a.download = 'test.csv';

// Append anchor to body.
document.body.appendChild(a)
a.click();

// Remove anchor from body
document.body.removeChild(a)

http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server

https://groups.google.com/a/chromium.org/forum/#!topic/chromium-html5/Mm8sex10aCg

Trello.prototype.req = function(method, path, data) {
    var self;
    self = this;
    return Promise.resolve().then(function() {
      var req;
      req = superagent[method]('https://api.trello.com' + path);
      if (method === 'get' || method === 'del') {
        req = req.query({
          key: self.key,
          token: self.token
        }).query(data);
      } else if (data.file && -1 !== path.indexOf('attachments')) {
        req = req.field('name', data.name).field('mimeType', data.mimeType).field('key', self.key).field('token', self.token);
        if (typeof data.file === 'string') {
          if (window.Blob) {
            req = req.attach('file', new File([data.file], data.name, {
              type: data.mimeType
            }), data.name);
          } else {
            req = req.set({
              'Content-Type': 'boundary=----WebKitFormBoundarygZLBN6gxSW5OC5W1'
            }).send("------WebKitFormBoundarygZLBN6gxSW5OC5W1\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\n" + data.name + "\r\n------WebKitFormBoundarygZLBN6gxSW5OC5W1\r\nContent-Disposition: form-data; name=\"mimeType\"\r\n\r\n" + data.mimeType + "\r\n------WebKitFormBoundarygZLBN6gxSW5OC5W1\r\nContent-Disposition: form-data; name=\"key\"\r\n\r\n" + self.key + "\r\n------WebKitFormBoundarygZLBN6gxSW5OC5W1\r\nContent-Disposition: form-data; name=\"token\"\r\n\r\n" + self.token + "\r\n------WebKitFormBoundarygZLBN6gxSW5OC5W1\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + data.name + "\"\r\nContent-Type: application/octet-stream\r\n\r\n" + data.file + "\r\n------WebKitFormBoundarygZLBN6gxSW5OC5W1--\r\n");
          }
        } else if (typeof data.file === 'object' && data.size) {
          req = req.attach('file', data.file, data.name);
        }
      } else {
        req = req.send({
          key: self.key,
          token: self.token
        }).send(data).set({
          'Content-type': 'application/x-www-form-urlencoded'
        });
      }
      return req.end();
    }).then(function(res) {
      return res.body;
    });
  };

  return Trello;

sendTextAsFile: function(State, data) {
    return Promise.resolve().then(function() {
      return trello.post("/1/cards/" + (State.get('card.id')) + "/attachments", {
        mimeType: '',
        name: State.get('attachment.name'),
        file: data['attachment.content']
      });
    }).then((function(_this) {
      return function(res) {
        humane.success("attachment <b>" + (State.get('attachment.name')) + "</b> saved on Trello.");
        if (State.get('attachment.id')) {
          _this.deleteAttachmentFromTrello(State, {
            card: State.get('card.id'),
            attachment: State.get('attachment.id')
          });
        }
        return State.change('attachment.id', res.id);
      };
    })(this)).then(handlers.listAttachments.bind(handlers, State))["catch"](console.log.bind(console));
  },


http://stackoverflow.com/questions/934012/get-image-data-in-javascript:

function toDataURL(url, callback){
var xhr = new XMLHttpRequest();
xhr.open('get', url);
xhr.responseType = 'blob';
xhr.onload = function(){
  var fr = new FileReader();
  fr.onload = function(){
    callback(this.result);
    };
  fr.readAsDataURL(xhr.response);
  };
xhr.send();
}

toDataURL(myImage.src, function(dataURL){
  result.src = dataURL;
  // now just to show that passing to a canvas doesn't held the same results
  var canvas = document.createElement('canvas');
  canvas.width = myImage.naturalWidth;
  canvas.height = myImage.naturalHeight;
  canvas.getContext('2d').drawImage(myImage, 0,0);

  console.log(canvas.toDataURL() === dataURL);
  });


http://webapps.stackexchange.com/questions/30424/how-to-encode-attachments-for-use-via-trello-web-api:

You should be able to add an attachment using the multipart/form-data content type:

<form action="https://api.trello.com/1/cards/REPLACE_WITH_CARD_ID/attachments"
      method="POST" enctype="multipart/form-data">
   <input type="hidden" name="key" value="REPLACE_WITH_YOUR_KEY" />
   <input type="hidden" name="token" value="REPLACE_WITH_YOUR_WRITE_TOKEN" />
   <input type="file" name="file">
   <input type="submit" value="Upload">
</form>
