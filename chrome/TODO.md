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

