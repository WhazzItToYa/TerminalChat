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

    // make it higher contrast if necessary
    let fg = window.getComputedStyle(username).color;
    console.log(`original color: ${fg}`);

    let rgb = fg.match(/\d+/g).map(Number);
    let newcolor = adjustColor(rgb, [0, 0, 0]);
    fg = `rgb(${newcolor[0]}, ${newcolor[1]}, ${newcolor[2]})`;
    console.log(`final color: ${newcolor}`);
    username.style.color = fg;

    newElement.querySelector("#message").innerHTML = insertEmotes(data);

    removeOldMessages();

    updateFadeoutTimer();
}

function getLuminance(r, g, b) {
    let a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(fg, bg) {
    let lum1 = getLuminance(fg[0], fg[1], fg[2]);
    let lum2 = getLuminance(bg[0], bg[1], bg[2]);
    let ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    console.log(`contrast is ${ratio}`);
    return ratio; // A ratio of 4.5+ is good for readability
}

function adjustColor(fg, bg) {
    while (getContrastRatio(fg, bg) < 4.5) {
        fg = fg.map(v => Math.min(255, v + (255-v)*0.25)); // Lighten foreground
    }
    return fg;
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
    let container = templateElement.parentElement;
    let newElement = templateElement.cloneNode(true);
    newElement.removeAttribute("id");

    // Make only this new line active.
    newElement.classList.add("active");
    let oldLines = container.querySelectorAll(".chatLine.active");
    oldLines.forEach( (elt,idx) => elt.classList.remove("active") );
    container.appendChild(newElement);
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
    console.log(`Message is ${JSON.stringify(messageData), null, 2}`);
    
    let textMessage = messageData.message.message;

    let outputMessage = "";
    for (const part of messageData.parts)
    {
        console.log(`processing ${JSON.stringify(part)}`);
        if (part.type === "text")
        {
            outputMessage += part.text;
        }
        else if (part.type === "emote")
        {
            outputMessage += `<img src="${encodeURI(part.imageUrl)}">`;
        }
    }
    return outputMessage;
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
