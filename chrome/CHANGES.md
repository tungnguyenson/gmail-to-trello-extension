A free tool that provides an extra 'Add card' button on Gmail UI to add current reading email to a Trello card

---

CHANGE LOG:

Version 2.4.24
---------------


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