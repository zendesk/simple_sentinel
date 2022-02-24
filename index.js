var shell = require('shelljs');

function redis_alive(port, verbose){
  return (shell.exec('redis-cli -p '+port+' ping', { silent: !verbose }).code === 0);
}

function sentinel_alive(port, verbose){
  return (shell.exec('redis-cli -p '+ port +' ping', { silent: !verbose }).code === 0);
}

function start_redis(port, slaveof) {
  var silent         = process.env.noverbose;
  var redis_dir      = __dirname + '/redis/' + port;
  var redis_log_file = redis_dir + '/redis.log';
  var redis_start    = 'redis-server ' +
                       ' --daemonize yes' +
                       ' --logfile ' + redis_log_file +
                       ' --dir ' + redis_dir +
                       ' --loglevel verbose' +
                       ' --port '+port;
                       shell.mkdir('-p', redis_dir);
                       shell.rm('-f', redis_log_file);

  if(!silent) console.log('Starting redis:'+port);
  if(!shell.which('redis-server')) {
    console.error('Please install redis >2.8.4');
    return(1);
  }

  if(slaveof) {
    redis_start = redis_start + ' --slaveof '+slaveof;
  }

  if (shell.exec(redis_start).code !== 0) {
    if(test('-f', redis_log_file)) {
      console.error('Failed to start redis. Here\'s the log:');
      cat(redis_log_file);
      return(1);
    }
    console.error('Failed to start redis, bailing...');
    return(1);
  }

  shell.exec('sleep 1');

  if(!redis_alive(port)) {
    if(test('-f', redis_log_file)) {
      console.error('Redis failed ping, Here\'s the log:');
      shell.cat(redis_log_file);
      return(1);
    }
    console.error('Redis failed ping, bailing...');
    return(1);
  }
  if(!silent) console.log('success');
}

function stop_redis(port) {
  var silent = process.env.noverbose;
  var redis_dir = __dirname + '/redis/' + port;
  var redis_log_file = redis_dir + '/redis.log';
  if(!silent) console.log('Shutting down redis:'+port);
  if(redis_alive(port)) {
    shell.exec('redis-cli -p '+port+' shutdown');
  } else {
    if(!silent) console.log('already down');
  }
  shell.rm('-f', redis_log_file);
  shell.rm('-rf', redis_dir);
}

function build_sentinel_config(name, host, port) {
  if(name && host && port) {
    return [ 'sentinel monitor '+name+ ' '+host+' '+port+' 1',
             'sentinel down-after-milliseconds '+name+' 2000',
             'sentinel failover-timeout '+name+' 90000',
             'sentinel parallel-syncs '+name+' 2'].join('\n');
  } else {
    return "";
  }
}

function start_sentinel(port, master_host, master_port) {
  var silent             = process.env.noverbose;
  var sentinel_dir       = __dirname + '/sentinel/' + port;
  var sentinel_conf_path = __dirname + '/sentinel/' + port + '/sentinel.conf';
  var sentinel_log_file  = sentinel_dir + '/sentinel.log';
  var sentinel_pid_file  = sentinel_dir + '/sentinel.pid';
  var sentinel_start     = 'redis-server ' + sentinel_conf_path +
                           ' --sentinel ' +
                           ' --daemonize yes' +
                           ' --logfile ' + sentinel_log_file +
                           ' --pidfile ' + sentinel_pid_file +
                           ' --port ' + port +
                           ' --loglevel verbose';
                           shell.mkdir('-p', sentinel_dir);
                           shell.rm('-f', sentinel_log_file);

  var fs = require('fs');
  var fd = fs.openSync(sentinel_conf_path, 'w');
  fs.writeSync(fd, build_sentinel_config('mymaster', master_host, master_port));
  fs.closeSync(fd);

  if(!silent) console.log('Starting sentinel:'+port);
  if(shell.exec(sentinel_start).code !== 0) {
    if(shell.test('-f', sentinel_log_file)) {
      console.error('Failed to start sentinel. Here\'s the log:');
      shell.cat(sentinel_log_file);
      return(1);
    }
    console.error('Failed to start sentinel, bailing...');
    return(1);
  }

  shell.exec('sleep 1');

  if(!sentinel_alive(port)) {
    if(test('-f', sentinel_log_file)) {
      console.error('Sentinel failed ping. Here\'s the log:');
      cat(sentinel_log_file);
      return(1);
    }
    console.error('Sentinel failed ping, bailing...');
    return(1);
  }
  if (!silent) console.log('success');
}

function stop_sentinel(port) {
  var silent             = process.env.noverbose;
  var sentinel_dir       = __dirname + '/sentinel/' + port;
  var sentinel_log_file  = __dirname + '/sentinel/'+ port +'/sentinel.log';
  var sentinel_pid_file  = __dirname + '/sentinel/'+ port +'/sentinel.pid';
  var sentinel_conf_path = __dirname + '/sentinel/' + port + '/sentinel.conf';
  if(!silent) console.log('Shutting down sentinel:'+port);
  if(sentinel_alive(port)) {
    var pid;

    if(shell.test('-f', sentinel_pid_file)) {
      pid = shell.exec('cat '+sentinel_pid_file, {silent:true}).output;
    } else {
      pid = shell.exec('redis-cli -p '+ port +' info | grep process_id | cut -d: -f2', {silent:true}).output;
    }
    if(pid) {
      pid = parseInt(pid);
      shell.exec('kill -TERM ' + pid);
    }
  } else {
    if(!silent) console.log('already down');
  }
  shell.rm('-f', sentinel_log_file);
  shell.rm('-f', sentinel_conf_path);
  shell.rm('-rf', sentinel_dir);
}

var default_config = {
  redis : {
    ports: [ 16379 ]
  },
  sentinel: {
    ports: [ 26379 ]
  }
};

module.exports = {

  start: function(config) {
    var i;
    config = config || default_config;
    if(config.redis && config.redis.ports) {
      var slaveof = 'localhost '+config.redis.ports[0];
      for(i = 0; i < config.redis.ports.length; i++) {
        start_redis(config.redis.ports[i], (i === 0)?'':slaveof);
      }
    }
    if(config.sentinel && config.sentinel.ports) {
      for(i = 0; i < config.sentinel.ports.length; i++) {
        start_sentinel(config.sentinel.ports[i], 'localhost', (config.redis && config.redis.ports && config.redis.ports[0]));
      }
    }
    return(0);
  },

  stop: function(config) {
    config = config || default_config;
    var i;
    if(config.redis && config.redis.ports) {
      var slaveof = 'localhost '+config.redis.ports[0];
      for(i = 0; i < config.redis.ports.length; i++) {
        stop_redis(config.redis.ports[i]);
      }
    }
    if(config.sentinel && config.sentinel.ports) {
      for(i = 0; i < config.sentinel.ports.length; i++) {
        stop_sentinel(config.sentinel.ports[i]);
      }
    }
    return(0);
  }
};
