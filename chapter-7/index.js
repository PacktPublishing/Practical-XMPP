var Component = require('node-xmpp-component')
var component = new Component({
  jid: 'component.localhost',
  password: 'mysecretcomponentpassword',
  host: 'localhost',
  port: '5347'
})

component.on('online', function() { console.log('Connected...') })

component.on('stanza', function(stanza) {
  if (true === stanza.is('iq')) {
    handleIq(stanza);
  }
  else if (true === stanza.is('message')) {
    handleMessage(stanza)
  }
} )

var handleIq = function(stanza) {
  var query = stanza.getChild('query')
  if (!query) {
    return
  }
  if (query.attrs.xmlns === 'http://jabber.org/protocol/disco#info')
  {
    var reply = new Stanza('iq', {
      type: 'result',
      id: stanza.id,
      from: stanza.to,
      to: stanza.from
    } )
    .c('query', { xmlns: 'http://jabber.org/protocol/disco#info' })
    .c('identity', {
      category: 'chat',
      name: 'First Component',
      type: 'text'
    } )
    .c('feature', {
      var: 'http://jabber.org/protocol/chat'
    } )

    component.send(reply)
    console.log("Replying with "+stanza)
  }
}


var handleMessage = function(stanza) {
  if (stanza.attrs.type === 'chat') {
    console.log('Responding to chat message by sending that same message back to the client')
    var text = stanza.getChild('body').getText()
    var reply = new Stanza('message', {
      to: stanza.from,
      from: stanza.to,
      type: 'chat'
    } ).c('body').t(text)
    component.send(reply);
  }
}
