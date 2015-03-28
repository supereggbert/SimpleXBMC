Kodi/XBMC JSON RPC node interface
=================================

![NPM Badge](https://nodei.co/npm/simple-xbmc.png?downloads=true&stars=true "NPM Badge")

# SimpleXBMC
The module uses [XBMC JSON-RPC Api V6](http://wiki.xbmc.org/index.php?title=JSON-RPC_API/v6) to provide a complete and simple API to allow communication with XMBC/Kodi instances using a TCP socket connection

Examples
--------

Connect to an XBMC/Kodi instance and send the PlayPause command:

```javascript

var SimpleXBMC=require('simple-xbmc');

var xbmc = new SimpleXBMC('127.0.0.1',9090);

xbmc.player.playPause({playerid: 1}, function(responce){
  console.log(responce);
});
```

Connect to an XBMC/Kodi instance and request the active players:

```javascript

var SimpleXBMC=require('simple-xbmc');

var xbmc = new SimpleXBMC('127.0.0.1',9090);

xbmc.player.getActivePlayers({}, function(responce){
  console.log(responce);
});
```

Using interface to receive notifications from XBMC/Kodi

```javascript

var SimpleXBMC=require('simple-xbmc');

var xbmc = new SimpleXBMC('127.0.0.1',9090);

xbmc.player.on('play',function(data){
  console.log('Play');
});

xbmc.player.on('pause',function(data){
  console.log('Pause');
});

xbmc.player.on('stop',function(data){
  console.log('Stop');
});
```

TODO
====

Tests?

