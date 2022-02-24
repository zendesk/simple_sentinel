simple_sentinel
===============

A simple nodejs utility to start and stop a test sentinel and redis.
Starts redis at port 16379 and sentinel at port 26379.

This is mainly intended as a test helper. If you have several projects which needs to run tests against redis and sentinel, you could include simple_sentinel as a package, and use it to start and stop your redis/sentinel setup.


Configuration
=============

For redis: we start redis with the following config
```
  redis-server
          --daemonize yes
          --logfile <file>
          --dir <dir>
          --loglevel verbose
          --port <port>
```
For sentinel: Created by reading this page: http://redis.io/topics/sentinel
```
  redis-server
          --sentinel
          --daemonize yes
          --logfile <file>
          --pidfile <file>
          --loglevel verbose
          --port <port>
```
with additional configs:
```
  sentinel monitor <master_name> <host> <port> 1
  sentinel down-after-milliseconds <master_name> 2000
  sentinel failover-timeout <master_name> 90000
  sentinel parallel-syncs <master_name> 2
```

Requirements
============

- redis (tested @2.8.4)
- node
- Include this package in your project, run npm install.

Usage
=====

```
-$ node_modules/simple_sentinel/bin/simple_sentinel --help

  Usage: simple_sentinel [start|stop]

  Commands:

    start     start redis and sentinel
    stop      stop redis and sentinel

  Options:

    -h, --help  output usage information
    -f, --config specify a config file
    -r, --redis <ports separated by comma>
    -s, --sentinel <ports separated by comma>
```

Config file
===========
We can specify different ports for redis and sentinels. The first redis port is treated as the master.
```
module.exports = {
  redis : {
    ports: [ 16379, 16380, 16381 ]
  },
  sentinel: {
    ports: [ 26379, 26380, 26381 ]
  }
};
```

In code
=======

You can also use simple_sentinel from code.

```
var simple_sentinel = require('simple_sentinel');
return_code = simple_sentinel.start(config);
return_code = simple_sentinel.stop(config);
```

Notes about stop
================

Stops redis:16379 by sending 'redis-cli -p 16379 shutdown', so watch out if you have redis running on that port.

For the sentinel, since the 'shutdown' command is not working on redis v2.8.4, we try to 'kill -TERM `cat sentinel.pid`'. If the pid file is not found, we further query by doing 'redis-cli -p 26379 | grep process_id', parse the pid and kill it.


## Copyright and license

Copyright 2014-2015 Zendesk

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.

You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
