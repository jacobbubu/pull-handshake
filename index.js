var defer = require('pull-stream').defer
var pull = require('pull-stream')

function once (fun, read) {
  var ended = false
  return function (abort, cb) {
    if(abort) return cb(ended = abort)
    if(!ended) {
      ended = true; fun(cb)
    }
    else read(abort, cb)
  }
}


function header (onHeader, rest) {
  var header = null
  return function (read) {
    read(null, function (err, data) {
      if(err) //abort the rest of the stream.
        return rest(function (abort, cb) { cb(err) })

      onHeader(data) //notify header.
      rest(read)     //consume the rest of the stream.
    })

  }
}

function wrap(stream, name) {
  return stream
}

function lazy (stream) {
  var read, started = false, id = Math.random()

  function consume (_read) {
    if(!_read) throw new Error('must be passed a readable')
    read = _read
    if(started) stream(read)
  }

  consume.ready =
  consume.start = function (_stream) {
    started = true; stream = _stream || stream
    if(read) stream(read)
  }

  return consume
}

exports = module.exports = function (myHeader, createStream) {
  var local, remote
  var send = defer()
  var receive = lazy()

  function next () {
    var s = createStream(local, remote)
    send.resolve(s.source)
    receive.start(s.sink)
  }

  return {
    source: 
      once(function (cb) {
        myHeader(function (err, handshake) {
          if(err) return cb(err)
          cb(null, local = handshake)
          if(local !== undefined && remote !== undefined) next()
        })
      }, send),
    sink: header(function (_remote) {
      remote = _remote

      if(local !== undefined && remote !== undefined) next()
    }, receive)
  }
}

exports.once = once
exports.lazy = lazy
exports.header = header