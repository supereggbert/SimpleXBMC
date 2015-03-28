(function() {
    var net = require('net'),
        events = require('events');

    var XBMCMethods = {
        Addons: ['ExecuteAddon', 'GetAddonDetails', 'GetAddons', 'SetAddonEnabled'],
        Application: ['GetProperties', 'Quit', 'SetMute', 'SetVolume'],
        AudioLibrary: ['Clean', 'Export', 'GetAlbumDetails', 'GetAlbums', 'GetArtistDetails', 'GetArtists', 'GetGenres', 'GetRecentlyAddedAlbums', 'GetRecentlyAddedSongs', 'GetRecentlyPlayedAlbums', 'GetRecentlyPlayedSongs', 'GetSongDetails', 'GetSongs', 'Scan', 'SetAlbumDetails', 'SetArtistDetails', 'SetSongDetails'],
        Files: ['Download', 'GetDirectory', 'GetFileDetails', 'GetSources', 'PrepareDownload'],
        GUI: ['ActivateWindow', 'GetProperties', 'SetFullscreen', 'ShowNotification'],
        Input: ['Back', 'ContextMenu', 'Down', 'ExecuteAction', 'Home', 'Info', 'Left', 'Right', 'Select', 'SendText', 'ShowCodec', 'ShowOSD', 'Up'],
        Player: ['GetActivePlayers', 'GetItem', 'GetProperties', 'GoTo', 'Move', 'Open', 'PlayPause', 'Rotate', 'Seek', 'SetAudioStream', 'SetPartymode', 'SetRepeat', 'SetShuffle', 'SetSpeed', 'SetSubtitle', 'Stop', 'Zoom'],
        Playlist: ['Add', 'Clear', 'GetItems', 'GetPlaylists', 'GetProperties', 'Insert', 'Remove', 'Swap'],
        System: ['EjectOpticalDrive', 'GetProperties', 'Hibernate', 'Reboot', 'Shutdown', 'Suspend'],
        VideoLibrary: ['Clean', 'Export', 'GetEpisodeDetails', 'GetEpisodes', 'GetGenres', 'GetMovieDetails', 'GetMovieSetDetails', 'GetMovieSets', 'GetMovies', 'GetMusicVideoDetails', 'GetMusicVideos', 'GetRecentlyAddedEpisodes', 'GetRecentlyAddedMovies', 'GetRecentlyAddedMusicVideos', 'GetSeasons', 'GetTVShowDetails', 'GetTVShows', 'RemoveEpisode', 'RemoveMovie', 'RemoveMusicVideo', 'RemoveTVShow', 'Scan', 'SetEpisodeDetails', 'SetMovieDetails', 'SetMusicVideoDetails', 'SetTVShowDetails'],
        JSONRPC: ['GetConfiguration', 'Introspect', 'NotifyAll', 'Permission', 'Ping', 'SetConfiguration', 'Version'],
        PVR: ['GetChannelDetails', 'GetChannelGroupDetails', 'GetChannelGroups', 'GetChannels', 'GetProperties', 'Record', 'Scan'],
        XBMC: ['GetInfoBooleans', 'GetInfoLabels']
    };

    var XBMCInterface = function(api, name, methods) {
        var i;
        events.EventEmitter.call(this);
        var len = methods.length;
        this.api = api;
        while (len) {
            len--;
            var methodName = methods[len];
            methodName = methodName[0].toLowerCase() + methodName.substr(1);
            this[methodName] = this.generateMethod(name + '.' + methods[len]).bind(this);
        }
    };
    XBMCInterface.prototype.__proto__ = events.EventEmitter.prototype;
    XBMCInterface.prototype.generateMethod = function(method) {
        return function(params, fn) {
            this.api.send(method, params, fn);
        };
    };

    var SimpleXBMC = function(host, port) {
        events.EventEmitter.call(this);
        var i, client = new net.Socket();
        this.client = client;
        if (host != undefined) this.connect(host, port);
        this.connected = false;
        this.defer = [];
        this.fn = {};
        this.buffer = '';
        this.id = 0;
        for (i in XBMCMethods) {
            var name = i[0].toLowerCase() + i.substr(1);
            if (i[1].toLowerCase() != i[1]) name = i;
            this[name] = new XBMCInterface(this, i, XBMCMethods[i]);
        }
    };
    SimpleXBMC.prototype.__proto__ = events.EventEmitter.prototype;
    SimpleXBMC.prototype.connect = function(host, port) {
        if (port == null) port = 9090;
        var client = this.client;
        client.connect(port, host, this.onConnected.bind(this));
        client.on('error', this.onError.bind(this));
        client.on('data', this.onData.bind(this));
        client.on('close', this.onClose.bind(this));
    };
    SimpleXBMC.prototype.close = function() {
        this.client.destroy();
    };
    SimpleXBMC.prototype.onData = function(buffer) {
        var str = this.buffer + buffer.toString();
        var newBuffer = str[0];
        var brackets = 1;
        for (var i = 1; i < str.length; i++) {
            var chr = str[i];
            newBuffer += chr;
            if (chr == '{') {
                brackets++;
            } else if (chr == '}') {
                brackets--;
            }
            if (brackets == 0) {
                this.processJSON(JSON.parse(newBuffer));
                newBuffer = ''
            }
        }
        this.buffer = newBuffer;
    };
    SimpleXBMC.prototype.processJSON = function(json) {
        if (json.id) {
            if (this.fn[json.id]) {
                this.fn[json.id](json.result);
                delete(this.fn[json.id]);
            }
            return;
        }
        if (json.method) {
            var notification = json.method.split(".");
            var notificationName = notification[0].toLowerCase();
            if (!this[notificationName]) notificationName = notification[0];
            if (this[notificationName] && notification[1].substr(0, 2) == "On") {
                this[notificationName].emit(notification[1].substr(2).toLowerCase(), json.params);
            }
        }
    };
    SimpleXBMC.prototype.onError = function(data) {
        this.emit('error', data);
    };
    SimpleXBMC.prototype.onClose = function(data) {
        this.emit('close', data);
    };
    SimpleXBMC.prototype.onConnected = function(data) {
        this.connected = true;
        this.processDefered();
        this.emit('Connected', data);
    };
    SimpleXBMC.prototype.processDefered = function() {
        var defer = this.defer;
        while (defered = defer.shift()) {
            this.send(defered[0], defered[1], defered[2]);
        }
    };
    SimpleXBMC.prototype.send = function(method, params, fn) {
        if (this.connected) {
            this.id++;
            if (params == null) {
                params = {};
            }
            var message = {
                "jsonrpc": "2.0",
                "method": method,
                "params": params,
                "id": "id" + this.id
            };
            if (fn) {
                this.fn["id" + this.id] = fn;
            }
            this.client.write(JSON.stringify(message));
        } else {
            this.defer.push([method, params, fn]);
        }
    };

    module.exports = SimpleXBMC;

}).call(this);
