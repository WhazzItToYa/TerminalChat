const urlParams = new URLSearchParams(window.location.search);
const KEEP_MESSAGES = urlParams.get('maxMessages') || 5;
const IGNORE_USERS = urlParams.get('ignoreUsers') || "";
const IGNORE_COMMANDS = isTrue(urlParams.get('ignoreCommands'));
const FADEOUT_TIME = urlParams.get('fadeout') || (60*60*24);
const IGNORED_USERS = {};

for (const u of IGNORE_USERS.split(/,/)) {
    let user = u.trim();
    console.log(`Ignoring user ${user}`);
    IGNORED_USERS[user.toLowerCase()] = true;
}

function isTrue(val)
{
    return val &&
        ((val.toLowerCase() === "true") ||
         (val.toLowerCase() === "yes"));
}

const client = new StreamerbotClient();

client.on('Twitch.ChatMessage', ({data}) => {
    try {
        displayChatMessage(data);
    } catch (e) {
        console.log(e);
    }
});

client.on('Twitch.ChatMessageDeleted', ({data: {messageId}}) => {
    deleteMessage(messageId);
});
client.on('Twitch.UserTimedOut', ({data: {user_id}}) => {
    deleteMessagesFrom(user_id);
});
client.on('Twitch.UserBanned', ({data: {user_id}}) => {
    deleteMessagesFrom(user_id);
});

// Appends a chat message to the display.
function displayChatMessage(data) {
    // console.dir(data);

    let messageId = data.messageId;
    let userId = data.message.userId;
    
    // Ignore certain users
    if (IGNORED_USERS[data.message.username]) return;
    // Ignore commands
    if (IGNORE_COMMANDS && data.message.message.startsWith("!")) return;

    let newElement = insertNewLine();

    // Put the message into the cloned element
    newElement.setAttribute("msgId", messageId);
    newElement.setAttribute("userId", userId);
    
    var username = newElement.querySelector("#user");
    username.textContent = data.message.displayName;
    username.style.color = data.message.color;
    
    newElement.querySelector("#message").innerHTML = insertEmotes(data);

    removeOldMessages();

    updateFadeoutTimer();
}

// Removes all but the last KEEP_MESSAGES messages.
function removeOldMessages()
{
    // Remove messages older than the last N messages.
    let messages = document.querySelectorAll(".chatLine:not(#chatMessageTemplate)");
    messages.forEach(
        function(elt, idx) {
            if (messages.length - idx > KEEP_MESSAGES) {
                elt.remove();
            }
        });
}

// Appends a blank line to the message display.
function displayBlankLine() {
    let line = insertNewLine();
    line.classList.remove("chatMessage");
    removeOldMessages();
}

// Appends a new line to the display, to be populated by the
// caller.
function insertNewLine()
{
    // Clone the template element for each new message.
    let templateElement = document.getElementById("chatMessageTemplate");
    let newElement = templateElement.cloneNode(true);
    newElement.removeAttribute("id");
    templateElement.parentElement.appendChild(newElement);
    return newElement;
}        

// Starts or restarts the delay to have the messages scroll off the top.
var fadeoutTimer;
function updateFadeoutTimer()
{
    if (fadeoutTimer) clearTimeout(fadeoutTimer);
    fadeoutTimer = setTimeout(() => {scrollOff(KEEP_MESSAGES);}, FADEOUT_TIME*1000);
}

// Animates scrolling numLines lines, starting now.
function scrollOff(numLines)
{
    if (numLines > 0) {
        displayBlankLine();
        fadeoutTimer = setTimeout(() => {scrollOff(numLines-1);}, 250);
    }
}

// Creates the html for a message containing emotes.
function insertEmotes(messageData) {
    let textMessage = messageData.message.message;
    let emotes = messageData.emotes;

    // Make sure the emotes are sorted left to right
    emotes.sort((e1, e2) => e1.startIndex - e2.startIndex);

    // We'll go through, span by span (span=substrings on emote
    // boundaries) extracting the span from the source message, and
    // appending or discarding&substituting the emote code.  The thing
    // that makes it tricky is that the emote boundary indexes count
    // UTF-32 characters (encoded as 2 javascript characters) as a
    // single char, so substrings & indexes need to count those chars
    // correctly.

    let outputMessage = "";
    let inputPos = 0;
    let prevIndex = 0;
    for (const emote of emotes)
    {
        // Get the portion of the message before the emote.
        let span = substring(textMessage, inputPos, emote.startIndex-prevIndex);
        outputMessage += span;
        inputPos += span.length;
        prevIndex = emote.startIndex;
        
        console.log(`emote ${emote.name} : ${emote.startIndex}-${emote.endIndex}`);
        console.log(`text is ${span}`);

        // Now get the portion of the message corresponding to the emote.
        let emoteSpan = substring(textMessage, inputPos, emote.endIndex+1-prevIndex);
        outputMessage += `<img src="${encodeURI(emote.imageUrl)}">`;
        inputPos += emoteSpan.length;
        prevIndex = emote.endIndex+1;
    }
    // And then the remaining portion of the message.
    outputMessage += textMessage.substring(inputPos);
    return outputMessage;
}

// Returns the substring of SOURCESTRING beginning at STARTINDEX position
// which contains SUBSTRINGLENGTH unicode characters (including > 0xffff).

function substring(sourceString, startIndex, substringLength)
{
    let endIndex = startIndex;
    for (var i = 0; i < substringLength; i++)
    {
        let codeUnit = sourceString.charCodeAt(endIndex);
        if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF)
        {
            endIndex += 2;
        } else
        {
            endIndex += 1;
        }
    }
    return sourceString.substring(startIndex, endIndex);
}

// Removes all messages from a particular USERID from the display.
function deleteMessagesFrom(userId)
{
    let msgs = document.querySelectorAll(`[userId="${userId}"`);
    for (const elt of msgs) {
        elt.remove();
    }
}

// Removes the message with a particular MSGID from the display.
function deleteMessage(msgId)
{
    let msgs = document.querySelectorAll(`[msgId="${msgId}"`);
    for (const elt of msgs) {
        elt.remove();
    }
}
