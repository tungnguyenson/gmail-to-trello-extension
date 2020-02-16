A free tool that provides an extra button on Gmail UI to add current reading email to a Trello card

---------------------------

CHANGE LOG:

Version 2.7.2.31@2020-02-15
---------------------------
- Try some changes to grow boxes (unsuccessfully)

Version 2.7.2.30@2020-02-15
---------------------------
- Gmail UI class names changed again, in gmailView we now use a single viewport: '.aia:first'. It was '.aeJ:first'. We no longer explicitly try to detect splitlayout, which may or may not work. Will need to test with folks.
- Initial error message when retrieving attachment content fails with 0 length. Probably CORS/CORB new Chrome security model, need to retrieve data from background script. Fix in progress but will take a while to refactor uploading code.

Version 2.7.2.29
-----------------
- Deeper highlighting for Labels and Assign, use gradient to indicate selected

Version 2.7.2.28
-----------------
- Remove trash can from GtT pull down
- Move popup location of GtT pull down to under icon

Version 2.7.2.27
-----------------
- Use new version of Trello Client.js

Version 2.7.2.26
-----------------
- Make sure UI, Sign-out works (enough) when Trello Authenticate fails.

Version 2.7.2.25
-----------------
- Look for old legacy classname m{UNIQUEID} only if other emailId tags aren't present

Version 2.7.2.24
-----------------
- Iterate differently

Version 2.7.2.23
-----------------
- Use data-thread-id if present

Version 2.7.2.22
-----------------
- Get Legacy Gmail Thread ID for backlink on new Gmail

Version 2.7.2.21
-----------------
- Find new Gmail views

Version 2.7.2.20
-----------------
- Make getManifest version check more robust error-handling-wise

Version 2.7.2.19
-----------------
- Fix calculation for pop-up when button position has changed

Version 2.7.2.18
-----------------
- New HD toolbar icon & sketch version
- Attachment image previews are now scale-to-fit
- Attachment file and image sections are hidden when there is no attachment
- [dev] Change form markups from dl/dt/dd to regular divs

Version 2.7.2.17
-----------------
- Fix bug on the new Gmail that cause toolbar buttons failed to work properly

Version 2.7.2.16
-----------------
- Remove overlapping intervals, thanks to Travis Hardman.

Version 2.7.2.15
-----------------
- Up debug log
- Silence logging of button positioner [still need to fix]
- Gmails coming up blank content in GtT - Change .adP:first to use more deterministic tag

Version 2.7.2.14
-----------------
- Check for ASL or ASF div for Refresh icon.
- Only call detach if more than one button/popup
- Use '0' for unknown version in version check
- More debugging logs for adding button / popup
- Only show version update if previous version > 0
- Remove toolBarHolder
- Debug Multiple Inboxes - more to do
- Circular log wasn't - hogged memory
- inline image now should upload to Trello correctly

Version 2.7.2.13
-----------------
- Restrict log from 1000 to 100 lines.
- Call browsingData from background to clear extension data.
- Show message to reload when version changes.

Version 2.7.2.12
-----------------
- Fix $button[0] -> $button.first().

Version 2.7.2.11
-----------------
- Fix missing views/options.html.

Version 2.7.2.10
----------------
- detectToolbar return true if detected.
- .detach button and popup and then only append one.
- Make sign out an explicit button on the page.

Version 2.7.2.9
----------------
- Fix resize via jQuery UI, needed clearfix at popup level for jQuery UI added elements

Version 2.7.2.8
----------------
- Call pre-init after button disappear
- Semi-final jQuery UI resizing (not quite right for normal state, works okay for list state)
- Show version number in options panel (prep for noticing version change and prompting to reload)

Version 2.7.2.7
----------------
- Remove G-Ni from GtT icon
- Add timer to check every 2 seconds for GtT button showing
- Use gh='mtb' to find toolbar

Version 2.7.2.6
----------------
- Add G-Ni to GtT icon
- Remove :first from G-atb

Version 2.7.2.5
----------------
- Additional debugging code in toolbar and labels code
- Report of GtT button not appearing when Streak and RightInbox, some tweaks to button positioning code to hopefully circumvent problem.
- Add info message to options screen
- Initial cut at button for chrome.browsingData.remove
- Update manifest with 64 and 128 icons

Version 2.7.2.4
----------------
- Icon not showing up in toolbar due to other extension icons in toolbar
- Update gtt_log to have timestamp

Version 2.7.2.3
----------------
- Move email search hyperlinks to top of content

Version 2.7.2.2
----------------
- Parse "29. Mai 2017 um 15:18" correctly
- (Until I have a better idea, have to decode the dateTime by hand and do some month comparisons)
- And then after doing that ton of work and realizing this will be horrific to maintain, I ripped it all out


Version 2.7.2.1
----------------
- Check for 401 more leniently, add target to error
- Lists without organizations were being filtered out! Fixed.
- Change Features/Bugs to 'Help'
- Created 'Report' feature, which will put latest error and last 1000 log items into card to post to GtT Trello board

Version 2.7.1.6
----------------
- 400 invalid id on attachment upload: Use pos === 'at' to indicate path to attach

Version 2.7.1.5
----------------
- Track mouseUp and mouseDown in same external-to-window container
- Make positioning logic more robust for Upload to combat Trello POST pos 404 error

Version 2.7.1.4
----------------
- Click outside window closes window
- Focus outside window closes window
- Error in attachments processing fixed to produce correct filename

Version 2.7.1.3
-----------------
- Install keyboard trap to Show Popup, Remove keyboard trap on Hide Popup

Version 2.7.1.2
-----------------
- Clean up consts for keyboard trap
- First cut at image with larger tooltip on hover
- Load jQuery UI CSS before our CSS so we can override it
- Add named function gtt_keydown to prevent duplicate listeners
- Bump version to work around Google problem


Version 2.7.0.4
-----------------
- Remove Gmail load wait timer now that GtT button is more robust on no-data
- Move keyboard trap to bindEvents
- Dirty centering when no data so popup will move as appropriate

Version 2.7.0.3
-----------------
- Fix error with "bottom" should be "below"
- Refactor upload code to pull it all into model work, add model.Uploader class
- Move attach code back into our code since Trello doesn't want it
- Fix error where attachment URL was click link instead of updated card
- Fixed long untruncated image/attachment string
- First cut at having GtT button always show, even when there is no data to populate - this may reduce the "where's my button?" support issues
- Have images bottom grow when you grab the window grow handle in the lower right corner

Version 2.7.0.1
-----------------
- Fix bug in creating new card
- Simplify UI for adding to a card vs. adding new card below

Version 2.7.0.0
-----------------
- Add to an existing card!
- Had to change UI a little to account for card selection and "where" to put the card

Version 2.6.0.0
-----------------
- Make minimum width bigger for popup
- Create shortcut dropdown for due date
- Create option entry to add more to shortcut dropdown
- Persist previous due date and time
- Attachments and Images now are transferred completely to Trello instead of lodging as links back to Gmail

Version 2.5.2.0
-----------------
- Attachments downloaded to memory and uploaded to Trello instead of just providing links

Version 2.5.1.3
-----------------
- Support keyboard shortcuts: Alt/Opt+Shift+G is the default to show the popup (once in Gmail and the button is visible)
- While the Popup is showing, hitting ESCAPE or CTRL+. or CMD+. will dismiss the popup.
- CTRL/CMD+ENTER will Add to Trello.
- Change stray bullets to asterisks but not stray hyphens

Verison 2.5.1.2
------------------
- Fix member assignment buttons to persist across board changes
- Shift-click "Labels:" or "Members:" to clear
- Fix typos GMail -> Gmail

Verison 2.5.1.1
------------------
- Layout changes to accomodate smaller screens

Version 2.5.1.0
------------------
- Can now assign other users
- Your id should always be first in Assign list
- Remove "Assign to me" button
- Move signout and error to chrome extension loaded html files
- Make label and member msg boxes same height as label and member chicklets so things don't "jump" up and down when picking new boards


Version 2.5.0.4
-------------------
- Fix pInterest loads with white overlay on top of first 20 pinned items -- was conflicting with jQuery UI CSS
- Moved jQuery-ui-css loading to top of popup
- Changed matches to mail.google.com instead of all urls.

Version 2.5.0.3
-------------------
- Fix problem of email with no body

Version 2.5.0.2
-------------------
- Try to fix parseData to always return a valid data block (even if empty data)
- Update board changed to clear out list/labels when settings boardId is different than boardId
- Gray box around imgs in image list to show "spacer" images
- Use window.location.pathname to provide "/mail/u/0/" or "/mail/u/1/" etc. for different gmail accounts

Version 2.5.0.1
-------------------
- Add support to attach images from Gmail
- Fix typo with missing brace for uriForDisplay
- To handle jQuery UI looking to Gmail for UI icons, must replace url("images... with url("chrome-extension://__MSG_@@extension_id__/images...

Version 2.4.27
---------------
- Support img vs text buttons

Version 2.4.26
---------------
- Make sure correct ThreadID is used for message
- Better processing of hand-provided bullets to markdown

Version 2.4.25
----------------
- Generate thread id for direct link to email
- Take another pass at storing board, list, label and resetting when changed

Version 2.4.24
---------------
- Use Gmail's down-facing widget instead of plus sign
- Make window resizable and scrollable

Version 2.4.23
---------------
- Separate date and time inputs for due date
- Smaller UI for Add Card button
- Change nomenclature to "Add to Trello" to prep for adding to individual card

Version 2.4.22
---------------
- Fix "Name" <name> email pattern

Version 2.4.21
---------------
- Make sure to clear out list and labels when no labels
- Restrict labels space to two rows with scroll bar if longer

Version 2.4.19
---------------
- Add back steps to clear cache for Trello sign-out

Version 2.4.18
---------------
- Add height and width to image tag so it doesn't "jump"
- Adjust centering logic for popup to be more human-friendly (still should move to lower-third resize logic)

Version 2.4.17
---------------
- Call Trello.deauthorize on Sign Out request
- Clean up logic of Sign Out to request Reload afterward
- Clean up error display to find error data in response packet
- Clean up 3+ CRLFs in Markdownify

Version 2.4.15
---------------
- Make replacements holistic
- Clean up markdownify to add numeric lists and allow <span>-like items inside of <div>-like items.
- Remove href="javascript:void(0)" as a likely cause of Content Security Policy warning

Version 2.4.14
---------------
- Change const hash to var hash, causing chrome storage error.
- Truncate description enough to make room for link at end

Version 2.4.12
---------------
- Match regex for Markdownify on non-word boundary, do additional pass and make placeholders then replace those so markdown anchors don't get out of hand

Version 2.4.11
---------------
- Change top/bottom popup to up-line and down-line arrow icons
- Change default for attachments to unchecked
- Fix bug where popup width wasn't being saved and restored correctly
- Fix avatar initials to be first name + last name initials, or first 2 chars of username, if no avatar URL/pic

Version 2.4.8
---------------
- Have reproducable case for settings not being saved; fixed with using chrome sync settings and getting timing right
- Added popup to indicate whether to add card to top or bottom (default) of list

Version 2.4.7
---------------
- Try another approach for titlebar of popup to not get duplicate options by setting explicit properties

Version 2.4.6
---------------
- Use paragraph marker for markdown 'li' conversion
- Respect () [] for anchor markdown bookends
- Clear out html before appending items, should fix duplicate html elements problem

Version 2.4.5
---------------
- Add APIFailure display when initial trello grabs fail out

Version 2.4.4
---------------
- Check for avatar URL returned before checking length

Version 2.4.3
---------------
- When text is selected, bring that over instead of entire message

Version 2.4.2
---------------
- Added Markdown button to turn off for main description text
- Added Attachments
- Changed Lists UI to Drop-down, kept styled UI for Labels
- Made labels multi-selectable

Version 2.3.1
---------------
- Added Due Date
- Additional markdown formatting causing too much noise

Version 2.2.2
---------------
- Adding Labels
- Movable modal UI centered under Add card, Avatars working
- Cleaned up UI
- Lots of bug fixes
- Some additional markdown formatting in description for from: email.

Version 2.1.5
---------------
- Add Google Analytics

Version 2.1.4
---------------
- Fix some XSS bugs. Reduce URL permission. Thanks to Vijay for your Pull Request
- Don't show up closed boards.
- Fix "Add to card" button UI

Version 2.1.3.8
---------------
- Fix some CSS bugs

Version 2.1.3.7
---------------
- Fix broken layout caused by min-width
- Increase z-index

Version 2.1.3.4
---------------
- Add "Options" page
- Fix no-wrap error in new card's link displays after creation
- Remove Organization filter

Version 2.1.3.1
-------------
- Add email address to specify where the card came from

Version 2.1.3
-------------
- Is now support an option to assign yourself on creating card

Version 2.1.2
-------------
- Is now support Split layout (Preview Panel)

Version 2.1
----------
- Big changes: refactoring, bugs fixes, UI/UX improvements
- Instantly update popup's content when user's clicking to another email thread
- Resizable popup
- Better text conversion

Version 2.0.6.2
----------
- Fix bug: Localization time parsing

Version 2.0.6
----------
- Add "Search email" ability, which means more accessible from other people
- Auto detect (and highlight) the email thread that is most closed to current viewport. Scrolling can make change to current selection

Version 2.0.5
----------
- Fix bug: Boards are not in any organizations doesn't show up.

Version 2.0.4
----------
- Fix bug duplicated buttons
- Fix bug in layout
- Fix bug: can't change subject or description


Version 2.0.1
----------
- Fix missing icons
- Backlink appearance improving


Version 2.0
----------
- Improve UX
- Remember previous selections
- Add a "close" popup button
- Add Orgranization list
- Don't display closed boards
- Insert a backlink to Gmail's thread in new card (optional)
- Display a link to new created card
- Refactoring

15/08/2013 - Version 1.1.1
----------
- Fix bug: missing button after install
- Fix bug: missing icon in "Add to Trello" button
- Keep line-breaks in email's content
- Auto remove email's signature
