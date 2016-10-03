const Client = require('node-xmpp-client')
const client = new Client({
  jid: 'bot@localhost',
  password: 'tellnoone',
  host: 'localhost'
})

client.on('online', function() {
  setInterval(publishStockValue, 250)
})

let stockValue = 500
const maximumChange = 10
let change = 0
var generateStockValue = function() {
  change = parseInt(Math.pow(Math.random(), 2) * maximumChange)
  if (Math.random() < 0.5) change *= -1
  stockValue += change
  if ((change < 0) && (Math.abs(change) > stockValue)) {
    change = -1 * stockValue
    stockValue = 0
  }
}

let id = 10
const publishStockValue = () => {
  generateStockValue()
  const dateString = new Date().toISOString()
  const stanza = new Client.ltx.Element('iq', { to: 'pubsub.localhost', type: 'set', id: ++id })
  stanza.c('pubsub', { xmlns: 'http://jabber.org/protocol/pubsub' })
    .c('publish', { node: 'stock-data-btc-rules' })
    .c('item', { id: dateString })
    .c('json', { xmlns: 'urn:xmpp:json:0' })
    .t(JSON.stringify({ value: stockValue, change, timestamp: dateString }))
  console.log(stanza.root().toString())
  client.send(stanza)
 }
