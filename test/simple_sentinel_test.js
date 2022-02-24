require('shelljs/global');
var assert         = require('assert');
var SimpleSentinel = require('../index.js');

const silent = false;
process.env.noverbose = silent;
describe('simple_sentinel', function() {
  describe('without config', function() {
    it('should start redis and sentinel', function() {
      this.timeout(10000);
      assert.equal(0, SimpleSentinel.start(null));
      assert.equal(0, exec('redis-cli -p 16379 ping', {silent: silent}).code);
      assert.equal(0, exec('redis-cli -p 26379 ping', {silent: silent}).code);
      assert.equal(0, exec('redis-cli -p 26379 sentinel master mymaster', {silent: silent}).code);
    });

    it('should stop redis and sentinel', function() {
      this.timeout(10000);
      assert.equal(0, SimpleSentinel.stop(null, silent));
      assert.ok(0 !== exec('redis-cli -p 16379 ping', {silent: silent}).code);
      assert.ok(0 !== exec('redis-cli -p 26379 ping', {silent: silent}).code);
    });
  });

  describe('with config', function() {
    var config = require('../sample_config.js');
    it('should start redis and sentinel', function() {
      this.timeout(10000);
      assert.equal(0, SimpleSentinel.start(config));
      assert.equal(0, exec('redis-cli -p 16379 ping', {silent: silent}).code);
      assert.equal(0, exec('redis-cli -p 16380 ping', {silent: silent}).code);
      assert.equal(0, exec('redis-cli -p 16381 ping', {silent: silent}).code);
      assert.equal(0, exec('redis-cli -p 26379 ping', {silent: silent}).code);
      assert.equal(0, exec('redis-cli -p 26380 ping', {silent: silent}).code);
      assert.equal(0, exec('redis-cli -p 26381 ping', {silent: silent}).code);
      assert.equal(0, exec('redis-cli -p 26379 sentinel master mymaster', {silent: silent}).code);
    });

    it('should stop redis and sentinel', function() {
      this.timeout(10000);
      assert.equal(0, SimpleSentinel.stop(config));
      assert.ok(0 !== exec('redis-cli -p 16379 ping', {silent: silent}).code);
      assert.ok(0 !== exec('redis-cli -p 16380 ping', {silent: silent}).code);
      assert.ok(0 !== exec('redis-cli -p 16381 ping', {silent: silent}).code);
      assert.ok(0 !== exec('redis-cli -p 26379 ping', {silent: silent}).code);
      assert.ok(0 !== exec('redis-cli -p 26380 ping', {silent: silent}).code);
      assert.ok(0 !== exec('redis-cli -p 26381 ping', {silent: silent}).code);
    });
  });

  describe('with singleton redis config', function() {
    var config = { redis: { ports: [ 16379 ] } };
    it('should start redis', function() {
      this.timeout(10000);
      assert.equal(0, SimpleSentinel.start(config));
      assert.equal(0, exec('redis-cli -p 16379 ping', {silent: silent}).code);
      assert.ok(0 !== exec('redis-cli -p 16380 ping', {silent: silent}).code);
      assert.ok(0 !== exec('redis-cli -p 26379 ping', {silent: silent}).code);
    });

    it('should stop redis', function() {
      this.timeout(10000);
      assert.equal(0, SimpleSentinel.stop(config));
      assert.ok(0 !== exec('redis-cli -p 16379 ping', {silent: silent}).code);
    });
  });

  describe('with no redis ports', function() {
    var config = { sentinel: { ports: [ 26379 ] } };
    it('should start sentinel', function() {
      this.timeout(10000);
      assert.equal(0, SimpleSentinel.start(config));
      assert.equal(0, exec('redis-cli -p 26379 ping', {silent: silent}).code);
      assert.ok(0 !== exec('redis-cli -p 16379 ping', {silent: silent}).code);
    });

    it('should stop sentinel', function() {
      this.timeout(10000);
      assert.equal(0, SimpleSentinel.stop(config));
      assert.ok(0 !== exec('redis-cli -p 26379 ping', {silent: silent}).code);
    });
  });

});
