var Client = require('node-xmpp-client')

var options = {
  jid: 'bot@localhost',
  password: 'tellnoone',
  host: 'localhost'
}

var client = new Client(options)

client.on('online', function(connectionDetails) {
  console.log('Client is connected!')
  console.log(connectionDetails)
})

var sendMessages = function() {
  var iqMessage = new Stanza('iq', {
    type: 'get',
    id: 'query1',
    to: 'component.localhost'
  }).c('query', { xmlns: 'http://jabber.org/protocol/disco#info' })
  client.send(iqMessage)

  client.send('<presence/>')

  var message = new Stanza('message', {
    to: 'component.localhost',
    type: 'chat'
  } )
  message.c('body').t('Hello, Component!')
  client.send(message)
}

client.on('stanza', function(stanza) {
  if (stanza.is('message') && stanza.attrs.type == 'chat') {
    console.log('Received message: ' + stanza.getChild('body').getText())
  }
} )

