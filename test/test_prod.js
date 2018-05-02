delete require.cache[require.resolve("../server.js")]
delete require.cache[require.resolve("../app.js")]
delete require.cache[require.resolve("../src/routes/index.js")]
var www = require("../server");
var request = require('request');
var expect = require('chai').expect;

console.log(1)

var url = 'http://localhost:2701/';
var devices = ["FP2", "bacon", "hammerhead", "cooler", "frieza", "krillin", "vegetahd", "arale", "turbo", "mako"]
var redirects = ["apps", "features", "install", "convergence", "design", "privacy", "devices", "telegram"]
var server;

before((ok) => {
  process.env.NODE_ENV = "production";
  process.env.PORT = 2701
  process.env.CPUS = 1
  server = www.run(ok);
})

describe("testing "+process.env.NODE_ENV, function () {
  devices.forEach(function (device) {
    describe("testing: " + url + "device/"+ device, function () {
      it('should return 200', function (done) {
        request.get(url + "device/" + device, function (err, res, body){
          expect(res.statusCode).to.equal(200);
          done();
        });
      });
      it('should return 404', function (done) {
        request.post(url + "device/" + device, function (err, res, body){
          expect(res.statusCode).to.equal(404);
          done();
        });
      });
    });
  });
  redirects.forEach(function (redirect) {
    describe("testing: " + url + redirect, function () {
      it('should return 302', function (done) {
        request({
          url: url + redirect,
          followRedirect: false,
          maxRedirects: 0
        }, function (err, res, body){
          expect(res.statusCode).to.equal(302);
          done();
        });
      });
    });
  });
});

after((done) => {
  server.close(done);
});
