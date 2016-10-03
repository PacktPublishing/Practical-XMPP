'use strict';

const Client = require('node-xmpp-client')
    , ltx = Client.ltx
const ddg = require('ddg')

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
    if (true === stanza.is('message')) {
        return handleMessage(stanza)
    } else if (true === stanza.is('presence')) {
        return handlePresence(stanza)
    }
})

const handleMessage = (stanza) => {
    const messageContent = stanza.getChildText('body')
    if (!messageContent) return /* Not a chat message */
    const from = stanza.attr('from')
    ddg.query(query, (error, data) => {
        let result = null
        if (error) {
          result = 'Unfortunately we could not answer your request'
        } else {
          if (!data.RelatedTopics[0]) {
            result = 'Sorry, there were no results!'
          } else {
            const item = data.RelatedTopics[0]
            result = item.FirstURL + '\n' + item.Text
          }
        }
        const reply = new ltx.Element(
          'message',
          { type: 'chat', to: from }
        )
        reply.c('body').t(result)
        client.send(reply)
    })
}

const handlePresence = (stanza) => {
    if (false === stanza.attr('subscribe')) {
       return /* We don't handle anything other than a subscribe */
    }
    const reply = new ltx.Element(
        'presence',
        { type: 'subscribed', to: stanza.attr('from') }
    )
    client.send(reply)
}
