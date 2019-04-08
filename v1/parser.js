exports.createUser = function(args, tags) {
    var user = {};

    var loginSplit = args[0].split('!');
    user.login = loginSplit[0];

    var argsSplit = args[0].split(':');
    if (argsSplit.length > 1) user.msg = argsSplit.slice(1).join(":");
    else user.msg = '';

    var channelSplit = argsSplit[0].split(' ');
    if (channelSplit.length > 2) user.channel = channelSplit[2];
    if (user.channel && user.channel.charAt(0) === '#') user.channel = user.channel.substr(1);

    user.display_name = tags['display-name'];
    user.user_id = Number(tags['user-id']);
    user.mod = Number(tags['mod']) === 1;
    user.subscriber = Number(tags['subscriber']) === 1;
    user.turbo = Number(tags['turbo']) === 1;
    user.user_type = tags['user-type'];

    // Sometimes these tags are present
    if (tags['login']) user.login = tags['login'];
    if (tags['color']) user.color = tags['color'];
    if (tags['badges']) user.badges = tags['badges'];
    if (tags['emotes']) user.emotes = tags['emotes'];
    if (tags['bits']) user.bits = tags['bits'];
    if (tags['message']) user.message = tags['message'];

    // Sometimes display name is not set, so make it login
    if (user.display_name.length == '' && user.login) {
        user.display_name = user.login;
    }

    return user;
};

exports.createRoomState = function (args, tags) {
    var room = {};

    var argsSplit = args[0].split(' ');
    room.channel = argsSplit[2];
    if (room.channel.charAt(0) === '#') room.channel = room.channel.substr(1); // Clear # in beginning

    room.room_id = tags['room-id']; // Should always be there
    if (tags['broadcaster-lang']) room.broadcaster_lang = tags['broadcaster-lang'];
    if (tags['emote-only']) room.emote_only = tags['emote-only'];
    if (tags['followers-only']) room.followers_only = tags['followers-only'];
    if (tags['r9k']) room.r9k = tags['r9k'];
    if (tags['slow']) room.slow = tags['slow'];
    if (tags['subs-only']) room.subs_only = tags['subs-only'];

    return room;
};
