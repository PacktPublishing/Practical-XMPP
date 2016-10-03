$(window.document).ready(function() {

  var socket = new Primus('//' + window.document.location.host)

  socket.on('error', function(error) { console.error(error) })

  var login = function() {
      socket.send(
          'xmpp.login.anonymous',
          { jid: '@anonymous.localhost', host: 'localhost' }
      )
      socket.on('xmpp.connection', function(data) {
          console.log('Connected as', data.jid)
          subscribeToNode()
      })
  }
 
  var subscribeToNode = function() {
    var options = {
        node: 'stock-data-btc-rules',
        to: 'pubsub.localhost'
    }
    socket.send('xmpp.pubsub.subscribe', options, function(error, success) {
      if (error) return console.log('Error subscribing', error)
      getOlderPosts()
    })
  }

  var items = []
  var getOlderPosts = function() {
    var details = {
      node: 'stock-data-btc-rules',
      to: 'pubsub.localhost'
    }
    socket.send(
      'xmpp.pubsub.retrieve',
      details,
      function(error, posts) {
        if (error) return console.log('Error retrieving posts', error)
        posts.forEach(function(post) {
            items.push(post)
        })
        drawInitialChart()
      }
    )
  }

  var stockChart = new TimeSeries()

  var drawInitialChart = function() {
    var chart = new SmoothieChart()
    chart.addTimeSeries(
      stockChart,
      {
        strokeStyle: 'rgba(0, 255, 0, 1)',
        fillStyle: 'rgba(0, 255, 0, 0.2)',
        lineWidth: 4
      }
    )
    items.reverse().forEach(function(item) {
      stockChart.append(
        new Date(item.entry.json.timestamp).getTime(),
        item.entry.json.value
      )
    })
    chart.streamTo(document.getElementById('chart'), 250)
    letsGetRealtime()
  }

  var letsGetRealtime = function() {
    socket.send('xmpp.presence')
  }

  socket.on('xmpp.pubsub.push.item', function(item) {
    stockChart.append(
      new Date(item.entry.json.timestamp).getTime(),
      item.entry.json.value
    )
  })

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
  
})
