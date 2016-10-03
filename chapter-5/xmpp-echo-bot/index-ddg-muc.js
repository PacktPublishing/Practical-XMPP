const Client = require('node-xmpp-client')
  , ltx = Client.ltx
  , ddg = require('ddg')

const options = {
  jid: 'bot@localhost/echo',
  password: 'tellnoone'
}
const client = new Client(options)
client.on('online', function(connectionDetails) {
  console.log('We are connected!')
  console.log(connectionDetails)
  sendPresence()
  joinChatRoom()
})

const joinChatRoom = function() {
  const stanza = new ltx.Element(
    'presence',
    { to: 'bttf@chat.localhost/answer-bot' }
  )
  console.log('Joining room: ' + stanza.toString())
  client.send(stanza)
}

const sendPresence = function() {
  const stanza = new ltx.Element('presence')
    .c('show')
    .t('available')
  console.log('Sending presence: ' + stanza.toString())
  client.send(stanza)
}

const NS_CHAT_STATE = 'http://jabber.org/protocol/chatstates'
const sendChatState = (to, state) => {
  var stanza = new ltx.Element('message', { type: 'chat', to })
  stanza.c(state, { xmlns: NS_CHAT_STATE })
  console.log('Sending chat state: ' + stanza.toString())
  client.send(stanza)
}

const handleMessage = (stanza) => {
  const query = stanza.getChildText('body')
  if (!query) return /* Not a chat message */
  const from = stanza.attr('from')
  const type = stanza.attr('type')
  const isMessageFromChatRoom = (0 === from.indexOf('bttf@chat.localhost'))
  const sendChatStateNotifications = (
    ('groupchat' !== type) && !isMessageFromChatRoom
  )
  if ('groupchat' === type) {
    if (0 !== query.indexOf('answer-bot:')) {
      return /* Not for us to respond to */
    }
    query = query.replace('answer-bot: ', '')
  }
  if (sendChatStateNotifications) sendChatState(from, 'active')
  ddg.query(query, function(error, data) {
    if (sendChatStateNotifications) sendChatState(from, 'composing')
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
    let responsePrefix = ''
    if (isMessageFromChatRoom && ('groupchat' === type)) {
      const jid = new Client.JID(from)
      responsePrefix = jid.getResource() + ': '
      from = jid.bare()
    }
    const reply = new ltx.Element(
      'message',
      { type: type, to: from }
    )
    reply.c('body').t(responsePrefix + result)
    if (sendChatStateNotifications) {
      reply.c('inactive', { xmlns: NS_CHAT_STATE })
    }
    console.log('Sending response: ' + reply.root().toString())
    client.send(reply)
  })
}

const handlePresence = (stanza) => {
  if (!stanza.attr('subscribe')) {
    return /* We don't handle anything other than a subscribe */
  }
  const reply = new ltx.Element('presence', { type: 'subscribed', to: stanza.attr('from') })
  client.send(reply)
}
client.on('stanza', function(stanza) {
  if (true === stanza.is('message')) {
    return handleMessage(stanza)
  } else if (true === stanza.is('presence')) {
    return handlePresence(stanza)
  }
})
