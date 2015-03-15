API samples 

Get Member's info
------------------

https://api.trello.com/1/members/me?key=c50413b23ee49ca49a5c75ccf32d0459&token=<token>

{"id":"4fe1a359700bbe3d205e29e5","avatarHash":"890b425b01eea6ec255438ab5c6385f8","bio":"","bioData":null,"confirmed":true,"fullName":"TungNS","idPremOrgsAdmin":[],"initials":"TS","memberType":"normal","products":[],"status":"idle","url":"https://trello.com/tungnguyenson","username":"tungnguyenson","avatarSource":"upload","email":null,"gravatarHash":"72988ae1733c1a8d0035d7d4aa904ce4","idBoards":["4fe1a359700bbe3d205e2a28","4fe5b8ddc56570256a0ba8c1","4fb4b2b68a035da13f59b392","4e7962f143cecbc072fceeaf","4fed81f4841320c446047157","4f7aaae4884e41fa4b5ebe02","50a44fbf0fdb1b383f00d48f","4fed12bc2138223d613bc37d","4fed0d6b5ba1eb606b25ca19","50e7f267ba2a89635c0016e3","50eb8b56801918b44c000c3f","5104d1f2e002eb8d5600241c","510770dba3c834f225008549","5121b4c2a28e3a03470021cd","514321bd285483120c0013e2","5152cba413c787aa1e00358c","5152cbc8e6c156d907003a6d","515becd3e9d9a5cf4800837d","515bece9e147a75d4b00899e","515c8408cc0b92957d000789","515c843d2b6946fb600005c5","516d6d133bdb27dc0f00089d","516d6ecf519c2a04780000f6","5177a2752f7344f71f003394","5188cc20ae1a983f51011b46","518a0f025912858b080022f8","51cc311df58462cf2c00091c","520b0d7d81aeaa6c0600004e","520b0d8ff11f77df150000dc","522e7bfcee85598b19005456","522ffbe0083b6cb547000106","5234e877fac59a0d540060cc","523fe521ab45ca843d004a84","52382201b71c250138001c8b","5268ff76874be19a6e00528e","527edf9f4fc854947300a9c0","527eee098a4abad21f0041af"],"idBoardsInvited":[],"idBoardsPinned":["4fe1a359700bbe3d205e2a28","4fe5b8ddc56570256a0ba8c1","4fb4b2b68a035da13f59b392","4e7962f143cecbc072fceeaf","4fed81f4841320c446047157","4f7aaae4884e41fa4b5ebe02","50a44fbf0fdb1b383f00d48f","4fed12bc2138223d613bc37d","4fed0d6b5ba1eb606b25ca19","50e7f267ba2a89635c0016e3","50eb8b56801918b44c000c3f","5104d1f2e002eb8d5600241c","510770dba3c834f225008549","5121b4c2a28e3a03470021cd","514321bd285483120c0013e2","5152cba413c787aa1e00358c","5152cbc8e6c156d907003a6d","515becd3e9d9a5cf4800837d","515bece9e147a75d4b00899e","515c8408cc0b92957d000789","515c843d2b6946fb600005c5","516d6d133bdb27dc0f00089d","516d6ecf519c2a04780000f6","5177a2752f7344f71f003394","5188cc20ae1a983f51011b46","518a0f025912858b080022f8","51cc311df58462cf2c00091c","520b0d7d81aeaa6c0600004e","520b0d8ff11f77df150000dc","522e7bfcee85598b19005456","522ffbe0083b6cb547000106","5234e877fac59a0d540060cc","523fe521ab45ca843d004a84","52382201b71c250138001c8b","5268ff76874be19a6e00528e","527edf9f4fc854947300a9c0","527eee098a4abad21f0041af"],"idOrganizations":["4fe5b881c56570256a0b91dc","50e79716860134c64e001114","520b0d577319055f27000073"],"idOrganizationsInvited":[],"loginTypes":null,"newEmail":null,"oneTimeMessagesDismissed":["BoardsListBC","GoldEarned"],"prefs":{"timezoneInfo":{"timezoneCurrent":"ICT","offsetCurrent":-420},"sendSummaries":true,"minutesBetweenSummaries":1,"minutesBeforeDeadlineToNotify":1440,"colorBlind":false},"trophies":["iOS"],"uploadedAvatarHash":"890b425b01eea6ec255438ab5c6385f8","premiumFeatures":[]}

Get Organizations
------------------
https://api.trello.com/1/members/me/organizations?key=c50413b23ee49ca49a5c75ccf32d0459&token=<token>&fields=displayName

[{"id":"520b0d577319055f27000073","displayName":"Tiki Mobile"},{"id":"50e79716860134c64e001114","displayName":"Tiki.vn"},{"id":"4fe5b881c56570256a0b91dc","displayName":"Trenity"}]

Get Board's info
------------------

https://api.trello.com/1/boards/4fed81f4841320c446047157?key=c50413b23ee49ca49a5c75ccf32d0459&token=<token>&lists=open&list_fields=name

{"id":"4fed81f4841320c446047157","name":"System & Engineering","desc":"","descData":null,"closed":false,"idOrganization":"50e79716860134c64e001114","pinned":true,"url":"https://trello.com/b/zlmjRPaq/system-engineering","shortUrl":"https://trello.com/b/zlmjRPaq","prefs":{"permissionLevel":"private","voting":"disabled","comments":"members","invitations":"members","selfJoin":false,"cardCovers":true,"backgroundColor":"#205C7E","backgroundImage":null,"backgroundImageScaled":null,"backgroundTile":false,"backgroundBrightness":"unknown","bg":"blue","canBePublic":true,"canBeOrg":true,"canBePrivate":true,"canInvite":true},"labelNames":{"red":"","orange":"","yellow":"","green":"","blue":"","purple":""},"lists":[{"id":"52aace388706f6842700664a","name":"Backlog"},{"id":"4fed81f4841320c446047158","name":"To Do"},{"id":"4fed81f4841320c446047159","name":"Doing"},{"id":"4fed81f4841320c44604715a","name":"Done"}]}

Get Card's members
------------------
Request:
https://api.trello.com/1/cards/IpL44Cjq/members?key=c50413b23ee49ca49a5c75ccf32d0459&token=<token>&fields=all

Response:
[{"id":"520883fd35bc150a31003288","avatarHash":"5dd1db2feb08eede257afd8d49c7380d","bio":"","bioData":null,"confirmed":true,"fullName":"Tráº§n Minh Quang","idPremOrgsAdmin":[],"initials":"QT","memberType":"normal","products":[],"status":"disconnected","url":"https://trello.com/quangtran5","username":"quangtran5"},{"id":"515c86115fe835424f000a40","avatarHash":null,"bio":"","bioData":null,"confirmed":true,"fullName":"TrungTM","idPremOrgsAdmin":[],"initials":"T","memberType":"normal","products":[],"status":"disconnected","url":"https://trello.com/trungtm","username":"trungtm"}]