//
// "XMPPong" Server-Side Component
//
const Component = require('node-xmpp-component')
    , ltx = require('ltx')
    , Gameloop = require('node-gameloop')

const componentJid = 'xmppong.localhost'
const PONG_NAMESPACE = 'xmpp:game:pong'

const component = new Component({
    componentJid,
    password: 'mysecretcomponentpassword',
    host: 'localhost',
    port: '5347'
})

component.on('online', () => console.log('Connected...'))

// Playing field dimensions
const width = 800, height = 600
const playfieldMinX = 0, playfieldMinY = 0
const playfieldMaxX = playfieldMinX + width
const playfieldMaxY = playfieldMinY + height

// Paddle sizes
const paddleMargin = 10
const paddleWidth = 20
let paddleHeight = [100, 100]
let paddleY = [height / 2, height / 2]

// Ball data
let ballX, ballY
const ballRadius = 3
let ballHeading // degrees
let ballSpeed  // pixels per millisecond

// Keeping track of players and their scores
const score = []
let playerJids = []
let numPlayers

// Game state, so we know when the game starts and ends
// (0 = not started, 1 = started, 2 = finished)
let gameState

component.on('stanza', (stanza) => {
    if (true === stanza.is('iq')) {
	    handleIq(stanza)
    } else if (true === stanza.is('message')) {
	    handleMessage(stanza)
    }
})

const addPlayer = (stanza) => {
  if (numPlayers < 2) {
    playerJids.push(stanza.jid)
    sendDimensions(
        playerJids[numPlayers],
        {
            width,
            height,
            paddleWidth,
            paddleHeight,
            paddleMargin,
            paddleY,
            ballRadius,
            side: playerJids.length
        }
    )
    score[numPlayers] = 0
    numPlayers++
    if (numPlayers === 2) startGame()
  } else if (numPlayers >= 2) {
    sendGameFullMessage(stanza.jid)
  }
}

const sendGameFullMessage = (to) => {
  const errorStanza = new ltx.Element('message', { type: 'error', to })
    .c('error', { type: 'cancel' })
    .c('conflict', { xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas' })
    .c('text')
    .t('Game is currently full')
    component.send(errorStanza)
}

const startGame = () => {
    gameState = 1
    resetGame()
}

const updateGame = () => {
    if (gameState !== 1) return

    // Update the ball's position
    ballX = ballX + Math.cos(ballHeading) * ballSpeed
    ballY = ballY + Math.sin(ballHeading) * ballSpeed
    sendBallPosition(ballX, ballY)

    // Check if the ball has hit the left paddle
    if (
        (ballX - ballRadius <= playfieldMinX + paddleMargin + paddleWidth) &&
        (ballY + ballRadius > paddleY[0]) &&
        (ballY – ballRadius < paddleY[0] + paddleHeight[0])
    ) {
      if ((ballHeading > Math.PI / 2.0) && (ballHeading <= Math.PI)) {
        ballHeading = Math.PI - ballHeading
      }
      if ((ballHeading > Math.PI) && (ballHeading <= 3.0 * Math.PI / 2.0)) {
        ballHeading = 3.0 * Math.PI - ballHeading
      }
    }

    // Check if the ball has hit the right paddle
    if (
        (ballX + ballRadius >= playfieldMaxX – paddleMargin – paddleWidth) &&
        (ballY + ballRadius > paddleY[1]) &&
        (ballY - ballRadius < paddleY[1] + paddleHeight[1])
    ) {
        if ((ballHeading > 3.0 * Math.PI / 2.0) && (ballHeading <= 2.0 * Math.PI)) {
            ballHeading = 3.0*Math.PI - ballHeading
        }
        if ((ballHeading > 0) && (ballHeading < Math.PI / 2.0)) {
            ballHeading = Math.PI - ballHeading
        }
    }

    // Check if ball has hit the top of the playfied
    if (ballY – ballRadius <= playfieldMinY) {
        ballHeading = 2.0 * Math.PI – ballHeading
    }

    // Check if ball has hit the bottom of the playfield
    if (ballY + ballRadius >= playfieldMaxY) {
        ballHeading = 2.0 * Math.PI – ballHeading
    }

    // Check if the ball has been missed by the left player
    if (ballX – ballRadius <= playfieldMinX) {
        updateScore(+0, +1)
        resetGame()
    }

    // Check if the ball has been missed by the right player
    if (ballX + ballRadius >= playfieldMaxX) {
        updateScore(+1, +0)
        resetGame()
    }

    if ((score[0] === 10) || (score[1] === 10)) {
        endGame()
    }
  }
}

const resetGame = () => {
    ballX = playfieldWidth / 2.0
    ballY = playfieldHeight / 2.0
    ballHeading = Math.random() * 2.0 * Math.PI
    ballSpeed = 2

    sendBallPosition({ x : ballX, y : ballY })
}

const endGame = () => {
    gameState = 2
    playerJids = []
    sendGameOver()
}

const updateScore = (player1delta, player2delta) => {
    score[0] += player1delta
    score[1] += player2delta
    sendScoreUpdate({ player1 : score[0], player2 : score[1] })
}

const receivePaddlePosition = (playerSide, paddleY) => {
    paddleY[playerSide] = paddleY
    sendOpponentPaddlePosition( { y : paddleY } )
}

const handleIq = (stanza) => {
    const query = stanza.getChild('query', 'http://jabber.org/protocol/disco#info')
    if (!query) return
    const reply = new Stanza(
      'iq',
      {
        type: 'result',
        id: stanza.attrs.id,
        from: stanza.attrs.to,
        to: stanza.attrs.from
      }
    )
     .c('query', { xmlns: 'http://jabber.org/protocol/disco#info' })

     reply.c('identity', { category: 'chat', name: 'XMPPong', type: 'text', jid: stanza.jid })
     reply.c('feature', { var: PONG_NAMESPACE })
     component.send(reply)
     console.log(`Replied to DISCO#info with ${reply.root().toString()}`)
}

const handleMessage = (stanza) => {
    const pong = stanza.getChild('pong', PONG_NAMESPACE)
    if (!pong) return
    const action = pong.getChildText('action')

    /* Is message from one of the players? If no, ignore? or add to game? */
    if (-1 !== playerJids.indexOf(stanza.attrs.from)) {
	console.log("Received message from someone besides our expected opponent!")
	return
    }

    /* Switch on 'body' and perform required action */
    if (action === 'playercheckingin') {
	addPlayer(stanza)
    } else if (action === 'paddleposition') {
	receivePaddlePosition(stanza.attrs.pong.getChildText(y))
    }
}


const sendDimensions = (dimensions) => {
    const stanza = new ltx.Element('message', { to: componentJid })
    stanza.c('body').t('dimensions')
    const pong = stanza.c('pong', { xmlns: PONG_NAMESPACE })
    for (let key in dimensions) {
        pong.c(key).t(dimensions[key])
    }
    component.send(stanza)
}

const sendBallPosition = (position) => {
    const stanza = new ltx.Element('message', { to: componentJid })
    stanza.c('body').t('ballposition')
    const position = stanza.c('pong', { xmlns: PONG_NAMESPACE }).c('position')
    position.c('x').t(position.x)
    position.c('y').t(position.y)
    playerJids.forEach((playerJid) => {
        stanza.attrs.to = playerJid
        component.send(stanza)
    })
}

const sendScoreUpdate = (score) => {
    const stanza = new ltx.Element('message', { to: componentJid })
    stanza.c('body').t('scoreupdate')
    stanza.c('pong', { xmlns: PONG_NAMESPACE }).c('score').t(score)
    playerJids.forEach((playerJid) => {
        stanza.attrs.to = playerJid
        component.send(stanza)
    })
}

const sendOpponentPaddlePosition = (y) => {
    const stanza = new ltx.Element('message', { to: componentJid })
    stanza.c('body').t('opponentpaddleupdate')
    stanza.c('pong', { xmlns: PONG_NAMESPACE }).c('position').c('y').t(y)
    playerJids.forEach((playerJid) => {
        stanza.attrs.to = playerJid
        component.send(stanza)
    })
}

const sendGameOver = () => {
    const stanza = new ltx.Element('message', { from: componentJid })
    stanza.c('body').t('gameover')
    stanza.c('pong', { xmlns: PONG_NAMESPACE })
    playerJids.forEach((playerJid) => {
        stanza.attrs.to = playerJid
        component.send(stanza)
    })
}

const id = Gameloop.setGameLoop(updateGame, 1000 / 30) /* 30 fps */
