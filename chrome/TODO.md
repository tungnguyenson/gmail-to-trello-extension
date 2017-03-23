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
