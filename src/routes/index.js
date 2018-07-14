const express = require('express');
const request = require('request');
const router = express.Router();
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const FetchRelease = require('fetchrelease').FetchRelease;
const installerRelease = new FetchRelease({user: "ubports", repo: "ubports-installer", cache_time: 3600}); // One hour cache
const SystemImageClient = require('system-image-node-module').Client;
const systemImageClient = new SystemImageClient({cache_time: 180})

const time = () => Math.floor(new Date() / 1000);
const BASE_URL = "https://api.ubports.com/v1/";

var cache = {}

// Internal
const getDevices = () => {
  return new Promise(function(resolve, reject) {
    console.log("devices request");
    var now=time();

    // Cache baby cache!!! :D :D
    if (cache.devices.expire > now) {
      console.log("use cache");
      resolve(cache.devices.data);
      return;
    }

    console.log("get new");
    request({
      method: "get",
      url: BASE_URL+"devices",
      json: true,
      headers: {
        'User-Agent': 'client request: server devices.ubuntu-touch.io'
      }
    }, (err, res, body) => {
      // If we hit an error, try using cache!
      if (err)
        resolve(cache.devices.data)
      resolve(body);
      // 3 munutes cache!
      cache.devices.expire = time()+180;
      cache.devices.data = body;
    });
  });
}

const getDevice = (device) => {
  return new Promise(function(resolve, reject) {
    console.log("devices request");
    var now=time();

    if (!cache[device])
      cache[device] = {expire:0};

    // Cache baby cache!!! :D :D
    if (cache[device].expire > now) {
      console.log("use cache")
      resolve(cache[device].data);
      return;
    }

    console.log("get new");
    request({
      method: "get",
      url: BASE_URL+"devices/"+device,
      json: true,
      headers: {
        'User-Agent': 'client request: server devices.ubuntu-touch.io'
      }
    }, (err, res, body) => {

      // Device not found, send reject!
      if(res.statusCode === 404)
        return reject();

      // If we hit an error, try using cache!
      if (err)
        return resolve(cache[device].data);

      if (body.about)
        body.about = md.render(body.about);

      resolve(body);

      // 3 minutes cache!
      cache[device].expire = time()+180;
      cache[device].data = body;
    });
  });
}

const getInstaller = (installerPackage) => {
  return new Promise((resolve, reject) => {
    switch (installerPackage) {
      case "linux":
      case "snap":
        resolve("https://snapcraft.io/ubports-installer");
        return;
      case "ubuntu":
      case "debian":
      case "mint":
        installerRelease.getAssetUrl("latest", "deb").then((r) => {resolve(r);});
        return;
      case "win":
      case "microsoft":
      case "windows":
        return installerRelease.getAssetUrl("latest", "exe").then((r) => {resolve(r);});
        return;
      case "apple":
      case "mac":
      case "macos":
        return installerRelease.getAssetUrl("latest", "dmg").then((r) => {resolve(r);});
        return;
      default:
        return installerRelease.getAssetUrl("latest", installerPackage).then((r) => {resolve(r);});
    }
  });
}

function notFound(res) {
  res.status(404);
  res.render('error', {
    message: "Device not found",
    error: {status: 404}
  });
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/apps', function(req, res, next) {
  res.redirect("https://open-store.io");
});

router.get('/features', function(req, res, next) {
  res.redirect("https://ubuntu-touch.io/features"); // TODO confirm URL
});

router.get('/install', function(req, res, next) {
  res.redirect("https://ubuntu-touch.io/install"); // TODO confirm URL
});

router.get('/convergence', function(req, res, next) {
  res.redirect("https://ubuntu-touch.io/features"); // TODO confirm URL
});

router.get('/design', function(req, res, next) {
  res.redirect("https://ubuntu-touch.io/design"); // TODO confirm URL
});

router.get('/privacy', function(req, res, next) {
  res.redirect("https://ubuntu-touch.io/features"); // TODO confirm URL
});

router.get('/devices', function(req, res, next) {
  res.redirect('/');
});

router.get('/api/devices', function(req, res, next) {
  getDevices().then(r => res.send(r));
});

router.get('/api/device/:device', function(req, res, next) {
  getDevice(req.params.device).then(r => res.send(r)).catch(() => res.send(404));
});

router.get('/device/:device', function(req, res, next) {
  Promise.all([
    getDevice(req.params.device),
    systemImageClient.getDeviceChannels(req.params.device).then(channels => {
      var releases = [];
      channels.forEach((rawChannel) => {
        releases.push(
          systemImageClient.getReleaseDate(req.params.device, rawChannel).then(releaseDate => {
            return {
              "channel": rawChannel.replace("ubports-touch/", ""),
              "date": releaseDate.substring(4, 10) + " " + releaseDate.substring(24, 28)
            };
          })
        );
      });
      return releases;
    })
  ]).then((r) => {
    // HACK: Wait for release date resuts, since we can't use await.
    Promise.all(r[1]).then(releaseDates => {
      res.render('device', {
        data: r[0],
        releases: releaseDates
      });
    });
  }).catch((e) => {
    console.log(e);
    notFound(res)
  });
});

router.get('/installer/:package', function(req, res, next) {
  // redirect to download url of the requested package
  // or package list if the requested package does not exist
  getInstaller(req.params.package).then((r) => {
    res.redirect(r || "https://github.com/ubports/ubports-installer/releases/latest")
  }).catch((e) => {
    console.log(e);
    res.redirect("https://github.com/ubports/ubports-installer/releases/latest");
  });
});

router.get('/installer', function(req, res, next) {
  res.redirect("https://github.com/ubports/ubports-installer/releases/latest");
});

router.get('/telegram', function(req, res, next) {
  res.redirect("https://telegram.me/ubports");
});

module.exports = router;
