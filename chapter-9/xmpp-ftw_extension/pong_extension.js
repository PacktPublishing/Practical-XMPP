'use strict';

const ltx  = require('ltx')
    , Base = require('xmpp-ftw').Base

var PongExt = function() {}

PongExt.prototype = new Base()

PongExt.prototype.NS_PONG = 'urn:xmpp:game:pong'

/* These are messages from the browser to the server */
PongExt.prototype._events = {
    playercheckingin: 'receivePlayerCheckingIn',
    paddleposition: 'receivePaddlePosition'
}

/* The server sends messages to the browser via:
 *   - handles: should this extension handle this stanza?
 *   - handle: do something with this stanza and emit an event on the socket
 */
PongExt.prototype.handles = function(stanza) {
    if (!stanza.is('message')) return false
    const pong = stanza.getChild('pong', this.NS_PONG)
    if (pong) {
        return true
    } else {
        return false
    }
}

PongExt.prototype.handle = function(stanza) {
    if (stanza.is('message')) {
        this._handleMessage(stanza)
    }
}

/* Event names here equal the text of the <action/> element
   Payloads (to the browser) are what you see in the 'data'
   variable, not JID is parsed into parts (local, domain, resource)
   for the component just 'domain' would be populated
 */
PongExt.prototype._handleMessage = function(stanza) {
    const pong = stanza.getChild('pong')
    const action = pong.getChildText('action')
    let data = null
    switch (action) {
        case 'scoreupdate':
            const player1 = pong.getChildText('player1')
            const player2 = pong.getChildText('player2')
            data = { player1, player2 }
            break
        case 'dimensions':
            const data = {}
            pong.children.forEach((child) => {
              data[child.getName()] = child.getText()
            })
            break
        case 'ballposition':
            const data = {
                x: pong.getChildText('x'),
                y: pong.getChildText('y')
            }
            break
        case 'opponentpaddleupdate':
            const data = {
                y: pong.getChildText('y')
            }
            break
        case 'gameover':
            data = {}
            break
    }

    if (data) {
        data.from = this._getJid(stanza.attrs.from)
        this.socket.send(action, data)
    }
}

PongExt.prototype.receivePlayerCheckingIn = function(data) {
    /*
      Direction: Browser to server
      Event: 'playercheckingin'
      Payload: { to: $componentJid, position: $yPosition }
    */
    const stanza = new ltx.Element('message', { to: data.to })
    stanza.c('body').t('playercheckingin')
    stanza.c('pong', { xmlns: this.NS_PONG }).c('action').t('playercheckingin')
    this.manager.client.send(stanza)
}

PongExt.prototype.receivePaddlePosition = function(data) {
    /*
      Direction: Browser to server
      Event: 'playercheckingin'
      Payload: { to: $componentJid, position: $yPosition }
    */
    const stanza = new ltx.Element('message', { to: data.to })
    stanza.c('body').t('paddleposition')
    const pong = stanza.c('pong', { xmlns: this.NS_PONG })
    pong.c('action').t('paddleposition')
    pong.c('y').t(data.position)
    this.manager.client.send(stanza)
}

module.exports = PongExt
