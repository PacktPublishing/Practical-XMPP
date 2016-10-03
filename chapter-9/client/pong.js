$(window.document).ready(function() {

    // Global variables
    let width, height
    let paddleMargin
    let paddleWidth
    let ballRadius

    // Player variables
    let paddleMargin, paddleWidth
    let paddleHeight[], paddle[]
    let ballRadius
    let ballX, ballY
    let side
    let player1score, player2score

    let gameOver = false
    var mouseDown = false

    var canvas = document.getElementById('pong')
    var context = canvas.getContext('2d')

    var socket = new Primus('//' + window.document.location.host)

    socket.on('error'), function(error) { console.error(error) }

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

      // Send check-in message
      socket.send('playercheckingin', { to: document.getElementById('componentJid').value })
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
        sendPadUpdate(pad1Y)
      }
    }

    socket.on('dimensions', handleDimensionMessage)
    socket.on('gameOver', handleGameOverMessage)
    socket.on('ballPosition', handleBallPositionMessage)
    socket.on('opponentPaddleUpdate', handleOpponentPaddleUpdateMessage)
    socket.on('updateScore', handleUpdateScoreMessage)

    function handleDimensionMessage(data) {
        width = data.width
        height = data.height
        paddleWidth = data.paddlewidth
        paddleHeight[0] = data.paddleheight
        paddleHeight[1] = data.paddleheight
        paddleMargin = data.paddlemargin
        paddle[0] = data.paddley
        paddle[1] = data.paddley
        ballRadius = data.ballradius
        side = data.side
      }

      function handleBallPositionMessage(data) {
        ballX = data.x
        ballY = data.y
      }

      function handleOpponentPaddleUpdateMessage(data) {
        paddle[1-side] = data.y
      }

      function handleUpdateScoreMessage(data) {
        player1score = data.player1score
        player2score = data.player2score
      }

      function handleGameOverMessage(data) {
        gameOver = true
      }

      function sendPaddleUpdate() {
        socket.send('paddleposition', { to: componentJid, y: paddle[side] })
        console.log('Sent new paddle position = ', paddle[side])
      }

    function clearField() {
      context.fillStyle = "#FFFFFF"
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      context.strokeStyle = "#000000"
      context.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    }

    function drawBall() {
      context.beginPath()
      context.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2.0, false)
      context.fillStyle = "#C11B17"
      context.fill()
      context.strokeStyle = "#9F000F"
      context.stroke()
    }

    function drawPaddle(x, y, w, h) {
      context.fillStyle = "#306EFF"
      context.fillRect(x, y, w, h)
      context.strokeStyle = "#2B65EC"
      context.strokeRect(x, y, w, h)
    }


    function drawPaddles() {
      drawPaddle(paddleMargin, paddle[0], paddleWidth, paddleHeight[0])
      drawPaddle(width - paddleMargin - paddleWidth, paddle[1], paddleWidth, paddleHeight[1])
    }


    function drawScore() {
      context.font = "36px Arial"
      context.fillStyle = "#000000"
      context.fillText(player1score, GAME_WIDTH / 2.0 - 100 - context.measureText(score1).
width, 40)
      context.fillText(player2score, GAME_WIDTH / 2.0 + 100, 40)
    }

    function setPaddlePosition(candidateY) {
      if ((candidateY > 0) && (candidateY < height)) {
        paddle[side] = candidateY
        sendPaddleUpdate(paddle[side])
      }
    }

    socket.on('open', function() {
      console.log('Connected')
      login()
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

    init()
})
