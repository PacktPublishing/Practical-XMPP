const express  = require('express')
  , Emitter    = require('primus-emitter')
  , Primus     = require('primus')
  , engine     = require('ejs-locals')
  , xmpp       = require('xmpp-ftw')
  , Disco      = require('xmpp-ftw-disco')
  , Muc        = require('xmpp-ftw-muc')

const app = express()

app.get('/', function(req, res){
    res.render('index')
})

const server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port)
})

app.configure(function() {
    app.use(express.static(__dirname + '/public'))
    app.set('views', __dirname + '/views')
    app.set('view engine', 'ejs')
    app.use(express.bodyParser())
    app.use(express.methodOverride())
    app.use(express.logger)
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }))
    app.engine('ejs', engine)
})

const options = {
    transformer: 'socket.io',
    parser: 'JSON',
    transports: [
        'websocket',
        'htmlfile',
        'xhr-polling',
        'jsonp-polling'
    ]
}

const primus = new Primus(server, options)
primus.use('emitter', Emitter)
primus.save(__dirname + '/public/scripts/primus.js')

primus.on('connection', function(socket) {
    console.log('Websocket connection made')
    const xmppFtw = new xmpp.Xmpp(socket)
    xmppFtw.clearListeners()
    xmppFtw.addListener(new Disco())
    xmppFtw.addListener(new Muc())
    socket.xmppFtw = xmppFtw
})

primus.on('disconnection', function(socket) {
    console.log('Client disconnected, logging them out')
    socket.xmppFtw.logout()
})
