$(window.document).ready(function() {

  // Global variables
  var GAME_WIDTH = 1000
  var GAME_HEIGHT = 800
  var PAD_X_MARGIN = 5
  var PAD_THICKNESS = 10
  var BALL_RADIUS = 3
  var BALL_X_SPEED = 4

  // Player variables
  var pad1Height = 100, pad2Height = 100
  var pad1Y = (GAME_HEIGHT - pad1Height) / 2, pad2Y = (GAME_HEIGHT - pad2Height) / 2
  var ballX, ballY
  var ballDeltaX, ballDeltaY
  var score1, score2
  var mouseDown = false
  var opponentJid
  var gameOn = false

  // Drawing variables
  var canvas = document.getElementById('pong')
  var context = canvas.getContext('2d')

  var socket = new Primus('//' + window.document.location.host)

  socket.on('error', function(error) { console.error(error) })

  socket.on('open', function() {
    console.log('Connected')
  })

  socket.on('timeout', function(reason) {
    console.error('Connection failed: ' + reason)
  })

  socket.on('end', function() {
    console.log('Socket connection closed')
    socket = null
  })

  socket.on('xmpp.error', function(error) {
    console.error('XMPP-FTW error', error)
  })

  socket.on('xmpp.error.client', function(error) {
    console.error('XMPP-FTW client error', error)
  })

  socket.on('xmpp.chat.message', handleMessage)
  socket.on('xmpp.discover.client', handleDisco)

  window.connect = function() {
    var options = {
      jid: document.getElementById('username').value,
      password: document.getElementById('password').value
    }

    socket.send('xmpp.login', options)
    socket.once('xmpp.connection', function(connectionDetails) {
      console.log(options.jid + ' is connected!')
      console.log(connectionDetails)
      sendHello(document.getElementById('opponent').value)
    })


  }

  window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      function(callback) {
          window.setTimeout(callback, 1000 / 60)
      }
  })()

  function init() {
    // Prevent I-Beam cursor from appearing on mousedown
    canvas.onselectstart = function () { return false }

    canvas.addEventListener('mousedown', doMouseDownEvent, false)
    canvas.addEventListener('mouseup', doMouseUpEvent, false)
    canvas.addEventListener('mousemove', doMouseMoveEvent, false)

    resetBallLocationAndDelta(-BALL_X_SPEED, +1)  // ADDED LATER
  }

  function gameLoop(canvas, context) {
    // We will populate this with update and drawing functions
    requestAnimFrame(function() {
      gameLoop(canvas, context)
    })
  }

  function doMouseDownEvent(event) {
    mouseDown = true
    setPad1Position(event.layerY)
  }

  function doMouseUpEvent(event) {
    mouseDown = false
  }

  function doMouseMoveEvent(event) {
    if (mouseDown) {
      setPad1Position(event.layerY)
    }
  }

  function setPad1Position(candidateY) {
    if ((candidateY > 0) && (candidateY < GAME_HEIGHT)) {
      pad1Y = candidateY
    }
  }

  function clearField() {
    context.fillStyle = "#FFFFFF"
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    context.strokeStyle = "#000000"
    context.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  }

  function drawBall() {
    context.beginPath()
    context.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2, false)
    context.fillStyle = "#C11B17"
    context.fill()
    context.strokeStyle = "#9F000F"
    context.stroke()
  }

  function drawPad(x, y, w, h) {
    context.fillStyle = "#306EFF"
    context.fillRect(x, y, w, h)
    context.strokeStyle = "#2B65EC"
    context.strokeRect(x, y, w, h)
  }

  function drawPad1() {
    drawPad(PAD_X_MARGIN, pad1Y, PAD_THICKNESS, pad1Height)
  }

  function drawPad2() {
    drawPad(GAME_WIDTH - PAD_X_MARGIN - PAD_THICKNESS, pad2Y, PAD_THICKNESS, pad2Height)
  }

  function drawScore() {
    context.font = "36px Arial"
    context.fillStyle = "#000000"
    context.fillText(score1, GAME_WIDTH / 2 - 100 - context.measureText(score1).width, 40)
    context.fillText(score2, GAME_WIDTH / 2 + 100, 40)
  }

  function resetBallLocationAndDelta(deltaX, deltaY) {
    ballX = GAME_WIDTH / 2
    ballY = GAME_HEIGHT / 2
    ballDeltaX = deltaX
    ballDeltaY = deltaY
  }

  function updateBallPosition() {
    ballX += ballDeltaX
    ballY += ballDeltaY

    if (ballX - BALL_RADIUS < PAD_X_MARGIN) {
      // Did ball get past Player 1?
      score2 += 1
      resetBallLocationAndDelta(-BALL_X_SPEED, -1)
    } else if (ballX + BALL_RADIUS > GAME_WIDTH - PAD_X_MARGIN) {
      // Did ball get past Player 2?
      score1 += 1
      resetBallLocationAndDelta(+BALL_X_SPEED, -1)
    }

    // Test for ricochet on top and bottom of game
    if ((ballY - BALL_RADIUS <= 0) || (ballY + BALL_RADIUS >= GAME_HEIGHT)) {
      ballDeltaY = -ballDeltaY
    }

    // Test for ricochet on paddles
    if (
      (ballX - BALL_RADIUS <= PAD_X_MARGIN + PAD_THICKNESS) &&
      (ballY + BALL_RADIUS >= pad1Y) &&
      (ballY - BALL_RADIUS <= pad1Y + pad1Height)
    ) {
      ballDeltaX = -ballDeltaX
      ballDeltaY = -ballDeltaY
    } else if (
      (ballX + BALL_RADIUS >= GAME_WIDTH - PAD_X_MARGIN - PAD_THICKNESS) &&
      (ballY + BALL_RADIUS >= pad1Y) &&
      (ballY - BALL_RADIUS <= pad1Y + pad1Height)
    ) {
      ballDeltaX = -ballDeltaX
      ballDeltaY = -ballDeltaY
    }
  }

  function sendHello(opponentJid) {
    socket.send(
      'xmpp.chat.message',
      {
        to: opponentJid,
        content: 'hello'
      }
    )
    console.log('Sent Hello message to', opponentJid)
  }

  function handleMessage(data) {
    if (0 === data.content.indexOf('hello')) {
      opponentJid = stanza.from.local + '@' + stanza.from.domain + '/' + stanza.from.resource
      console.log('Received hello from ', opponentJid)
      gameOn = true
    } else if (0 === data.content.indexOf('paddleUpdate')) {
      pad2Y = data.content.split(':')[1]
    }
  }

  function handleDisco(data) {
    socket.send(
      'xmpp.discover.client',
      {
        to: data.from,
        id: data.id,
        features: [
          { kind: 'identity', type: 'text', name: 'XMPPong', category: 'chat' },
          { kind: 'feature', var: 'http://jabber.org/protocol/chat' }
        ]
      },
      function(error, data) { console.log(error, data) }
    )
    console.log('Replied to disco#info request with ', reply)
  }

  function sendPaddleUpdate(newPadY) {
    socket.send(
      'xmpp.chat.message',
      {
        to: opponentJid,
        content: 'paddleUpdate:' + newPadY
      }
    )
    console.log('Sent update - newPadY = ', newPadY)
  }

  function setPad1Position(candidateY) {
    if ((candidateY > 0) && (candidateY < GAME_HEIGHT)) {
      pad1Y = candidateY
      sendPaddleUpdate(pad1Y)
    }
  }

  function gameLoop(canvas, context) {
	  if (gameOn) {
        updateBallPosition()
        clearField()
        drawPad1()
        drawPad2()
        drawBall(ballX, ballY)
        drawScore()
      }

    requestAnimFrame(function() {
      gameLoop(canvas, context)
    })
  }

  init()
  gameLoop()

})
