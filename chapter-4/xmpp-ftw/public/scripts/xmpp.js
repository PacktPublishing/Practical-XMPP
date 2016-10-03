$(window.document).ready(function() {

  var socket = new Primus('//' + window.document.location.host)

  socket.on('error', function(error) { console.error(error) })

  var handleItems = function(error, items) {
      if (error) return console.error(error)
      console.log('Node items received', items)
      $('ul.posts').empty()
      var content
      items.forEach(function(item) {
          content = '<li>'
          content += item.entry.atom.content.content
          content += '<br/>&nbsp;&nbsp;&nbsp;&nbsp;by '
          content += item.entry.atom.author.name
          content += '</li>'
          $('ul.posts').append(content)
      })
  }

  var getNodeItems = function() {
      console.log('Retrieving node items')
      socket.send(
          'xmpp.buddycloud.retrieve',
          { node: '/user/team@topics.buddycloud.org/posts', rsm: { max: 5 } },
          handleItems
      )
  }

  var discoverBuddycloudServer = function() {
      socket.send(
          'xmpp.buddycloud.discover',
          { server: 'channels.buddycloud.org' },
          function(error, data) {
              if (error) return console.error(error)
              console.log('Discovered Buddycloud server at', data)
              getNodeItems()
          }
      )
  }

  var login = function() {
      socket.send(
          'xmpp.login.anonymous',
          { jid: '@anon.buddycloud.org' }
      )
      socket.on('xmpp.connection', function(data) {
          console.log('Connected as', data.jid)
          discoverBuddycloudServer()
      })
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
})
