'use strict';

const Client = require('node-xmpp-client')
    , ltx = Client.ltx

const options = {
	jid: 'bot@localhost',
	password: 'tellnoone'
}
const client = new Client(options)
client.once('online', (connectionDetails) => {
	console.log('We are connected!')
	console.log(connectionDetails)
    sendPresence()
})

const sendPresence = () => {
  const stanza = new ltx.Element('presence')
  console.log('Sending presence: ' + stanza.toString())
  client.send(stanza)
}

client.on('stanza', (stanza) => {
    if (false === stanza.is('message')) return /* Not a <message/> stanza */
    const messageContent = stanza.getChildText('body')
    if (!messageContent) return /* Not a chat message */
    const from = stanza.attr('from')
    const logEntry = `Received message from ${from} with content:\n${messageContent}`
    console.log(logEntry)
    const reply = new ltx.Element(
        'message',
        { type: 'chat', to: from }
    )
    reply.c('body').t(messageContent)
    client.send(body)
})
