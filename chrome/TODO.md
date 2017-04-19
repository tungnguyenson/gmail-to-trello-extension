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

http://stackoverflow.com/questions/4238809/example-of-multipart-form-data:
POST / HTTP/1.1
Host: localhost:8000
User-Agent: Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:29.0) Gecko/20100101 Firefox/29.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Cookie: __atuvc=34%7C7; permanent=0; _gitlab_session=226ad8a0be43681acf38c2fab9497240; __profilin=p%3Dt; request_method=GET
Connection: keep-alive
Content-Type: multipart/form-data; boundary=---------------------------9051914041544843365972754266
Content-Length: 554

-----------------------------9051914041544843365972754266
Content-Disposition: form-data; name="text"

text default
-----------------------------9051914041544843365972754266
Content-Disposition: form-data; name="file1"; filename="a.txt"
Content-Type: text/plain

Content of a.txt.

-----------------------------9051914041544843365972754266
Content-Disposition: form-data; name="file2"; filename="a.html"
Content-Type: text/html

<!DOCTYPE html><title>Content of a.html.</title>

-----------------------------9051914041544843365972754266--


Request Headers
Provisional headers are shown
Accept:application/json, text/javascript, */*; q=0.01
Content-Type:application/x-www-form-urlencoded; charset=UTF-8
Origin:https://mail.google.com
Referer:https://mail.google.com/mail/u/0/
User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36

Form Data
view source
view URL encoded
key:c50413b23ee49ca49a5c75ccf32d0459
token:e50e1d7ebd3e252477a38a41d6c1cd002bfc6b4ebab61366c9a09b3bd9c9088d
mimeType:multipart/form-data; boundary=BOUNDARY1234
Content-Type:multipart/form-data; boundary=BOUNDARY1234
name:PDF file [image/png]
file:
--BOUNDARY1234
Content-Disposition: form-data; name="PDF file [image/png]"; filename="icon_3_pdf_x32.png"
Content-Type: image/png

�PNG

IHDR  szz�sBIT|d�<IDATX�핱J�P��s)�C�n�����ֽq�9��Ny'�.m����H�B禐'�.R���b���&�^�|SHN���r�����A!}؀�8��$�t<�2�������.��BaM�
B_8�M�  �<@Kx˷_�5��>^W��.Oz7p����5z�O8���63�Sa���F�L��T'���}q����:FD�cRf\�Gi��@������+�02���*С4 ��m�������@�4e���8F�R맸̮T2 ��+����eq�7l4�AF�l:#\�'p �8��ٷj�����I���l�k��IEND�B`�
--BOUNDARY1234--

Trello Support via helpscout.net 
Apr 3 (2 days ago)

to me 
Hi Andrew,

Thanks for reaching out. I'm going to check in on this with our developer advocate. Either he or I will be back in touch once we've discussed your question.

Let us know if you have any other questions or concerns in the meantime, and we'd be happy to help.

All the best,

Caity
The Trello Team

Need priority support for your business? Check out Trello Business Class.

How satisfied were you with your interaction with Trello Support?
Very Satisfied  Neutral   Not satisfied
{#HS:343464622-184253#}   
On Sun, Apr 2, 2017 at 5:08 AM EDT, Andrew Coven <a@cov.in> wrote:
Andrew Coven (acoven) has authorized you to access their account. 
Access Account (Be sure to use an Incognito Window.) 
Disable Access (Expiration: Sun Apr 09 2017 05:08:26 GMT-0400 (EDT))



On Sun, Apr 2, 2017 at 5:08 AM EDT, Andrew Coven <a@cov.in> wrote:
Attaching a file to a card that exists in memory not on disk. Have tried all sorts of ideas from all over the web. Could you please point me at a working example of attaching a file to a card? Like a real file, not a "@[your/file/here]" example. Because it seems impossible. I don't know if it's supposed to be just binary data, or UUENCODED, or what. Postings suggest only form-data works, but I haven't yet been able to get that to work for me. PLEASE HELP.

Trello Support via helpscout.net 
Apr 3 (2 days ago)

to me 
Hey Andrew,

Sorry that our docs are lacking on this. Can you give me some more details about what types of files you are wanting to attach?

I attached a html file by grabbing the binary of it and copying and pasting it (using: xxd thing.html | pbcopy) into a curl command:
curl -X POST -d key=mykey -d token=mytoken https://api.trello.com/1/cards/58e2a7bb3e6e4bfe3eaace42/attachments -d file="00000000: 3c68 746d 6c3e 3c2f 6874 6d6c 3e <html></html>" -d name="thing.html"

This attached the html file as I would expect: https://trello.com/c/MQN6UicM/2-in-memory

I also attached a file from my desktop using the @ annotation:
curl --form "file=@./chorizo.png" https://api.trello.com/1/cards/58e2691ca29a7d21651dad51/attachments\?key\=mykey\&token\=mytoken

And that attached the file here: https://trello.com/c/LxLyKKH3/1-chorizo

Let me know if this isn't helpful. Also, once I hear back about context/file, I'll keep digging!

All the best,

Bentley
The Trello Team

Need priority support for your business? Check out Trello Business Class.

How satisfied were you with your interaction with Trello Support?
Very Satisfied  Neutral   Not satisfied
{#HS:343464622-184253#}  


Andrew Coven  
This is super helpful, thank you. I'm trying to upload a jpg via javascript. ...
Apr 4 (1 day ago)

Trello Support via helpscout.net 
11:34 AM (11 hours ago)

to me 
I made a gist with the verbose output from curl: https://gist.github.com/bentleycook/f7a71bba48a94e456ed23cfe5004bbe6.

Just to confirm, you are currently using Client.js? I'm not deeply familiar with how it implements POSTing. Might be something we can update to accommodate your use-case.

The binary data is just a straight hex dump.

All the best,

Bentley
The Trello Team

Need priority support for your business? Check out Trello Business Class.

How satisfied were you with your interaction with Trello Support?
Very Satisfied  Neutral   Not satisfied
{#HS:343464622-184253#}  


Andrew Coven <a@cov.in>
1:45 PM (8 hours ago)

to Trello 
Awesome thanks. Yeah I'm currently using your Client.js. Want to try hacking it with me to give it a function that'll work for this case? Might be as easy as noticing a Content-Type passed in as an option and grabbing and using it. Do you have the source beyond the coffeesxeipt that's posted? I only have the minified version.


Trello Support
1:58 PM (8 hours ago)

to me 
Yeah, the full source is here: https://trello.com/1/client.coffee. It looks like it is doing some pretty basic stuff WRT passing through POST requests. Let me play around with it and see if we can't do better.

All the best,

Bentley
The Trello Team

Need priority support for your business? Check out Trello Business Class.

How satisfied were you with your interaction with Trello Support?
Very Satisfied  Neutral   Not satisfied
{#HS:343464622-184253#}  

curl --form "file=@./chorizo.png" https://api.trello.com/1/cards/58e2691ca29a7d21651dad51/attachments\?key\=myKey\&token\=myToken --verbose
*   Trying 88.221.5.192...
* TCP_NODELAY set
* Connected to api.trello.com (88.221.5.192) port 443 (#0)
* TLS 1.2 connection using TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
* Server certificate: *.trello.com
* Server certificate: DigiCert SHA2 Secure Server CA
* Server certificate: DigiCert Global Root CA
> POST /1/cards/58e2691ca29a7d21651dad51/attachments?key=myKey&token=myToken HTTP/1.1
> Host: api.trello.com
> User-Agent: curl/7.51.0
> Accept: */*
> Content-Length: 100626
> Expect: 100-continue
> Content-Type: multipart/form-data; boundary=------------------------40a57310b3358855
>
< HTTP/1.1 100 Continue
< HTTP/1.1 200 OK
< Cache-Control: max-age=0, must-revalidate, no-cache, no-store
< X-Content-Type-Options: nosniff
< Strict-Transport-Security: max-age=15768000
< X-XSS-Protection: 1; mode=block
< X-FRAME-OPTIONS: DENY
< X-Trello-Version: 1.928.2
< X-Trello-Environment: Production
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: GET, PUT, POST, DELETE
< Access-Control-Allow-Headers: Authorization, Accept, Content-Type
< X-Server-Time: 1491416757193
< Expires: Thu, 01 Jan 1970 00:00:00
< Content-Type: application/json; charset=utf-8
< Content-Length: 363
< ETag: W/"16b-eab2928f"
< Vary: Accept-Encoding
< Date: Wed, 05 Apr 2017 18:25:57 GMT
< Connection: keep-alive
<
* Curl_http_done: called premature == 0
* Connection #0 to host api.trello.com left intact
{"id":"58e536b15d3355e71a1bae36","bytes":100423,"date":"2017-04-05T18:25:53.860Z","edgeColor":null,"idMember":"5589c3ea49b40cedc28cf70e","isUpload":true,"mimeType":null,"name":"chorizo.png","previews":[],"url":"https://trello-attachments.s3.amazonaws.com/58e2690d7d9c2211e3d30a52/58e2691ca29a7d
POSTing w/ binary .html file

curl -X POST -d key=myKey -d token=myToken https://api.trello.com/1/cards/58e2a7bb3e6e4bfe3eaace42/attachments -d file="00000000: 3c68 746d 6c3e 3c2f 6874 6d6c 3e0a       <html></html>." -d name="thing.html" --verbose
Note: Unnecessary use of -X or --request, POST is already inferred.
*   Trying 88.221.5.192...
* TCP_NODELAY set
* Connected to api.trello.com (88.221.5.192) port 443 (#0)
* TLS 1.2 connection using TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
* Server certificate: *.trello.com
* Server certificate: DigiCert SHA2 Secure Server CA
* Server certificate: DigiCert Global Root CA
> POST /1/cards/58e2a7bb3e6e4bfe3eaace42/attachments HTTP/1.1
> Host: api.trello.com
> User-Agent: curl/7.51.0
> Accept: */*
> Content-Length: 194
> Content-Type: application/x-www-form-urlencoded
>
* upload completely sent off: 194 out of 194 bytes
< HTTP/1.1 200 OK
< Cache-Control: max-age=0, must-revalidate, no-cache, no-store
< X-Content-Type-Options: nosniff
< Strict-Transport-Security: max-age=15768000
< X-XSS-Protection: 1; mode=block
< X-FRAME-OPTIONS: DENY
< X-Trello-Version: 1.928.2
< X-Trello-Environment: Production
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: GET, PUT, POST, DELETE
< Access-Control-Allow-Headers: Authorization, Accept, Content-Type
< X-Server-Time: 1491417023779
< Expires: Thu, 01 Jan 1970 00:00:00
< Content-Type: application/json; charset=utf-8
< Content-Length: 353
< ETag: W/"161-b7ce52f2"
< Vary: Accept-Encoding
< Date: Wed, 05 Apr 2017 18:30:23 GMT
< Connection: keep-alive
<
* Curl_http_done: called premature == 0
* Connection #0 to host api.trello.com left intact
{"id":"58e537bf6948e339416afbd0","bytes":65,"date":"2017-04-05T18:30:23.614Z","edgeColor":null,"idMember":"5589c3ea49b40cedc28cf70e","isUpload":true,"mimeType":null,"name":"thing.html","previews":[],"url":"https://trello-attachments.s3.amazonaws.com/58e2690d7d9c2211e3d30a52/58e2a7bb3e6e4bfe3eaace42/5f5131a51646e02a18667eeb5fdcb76d/Upload","pos":65536}%

