$(window.document).ready(function() {

  window.socket = new Primus('//' + window.document.location.host)

  socket.on('error', function(error) { console.error(error) })

  var login = function() {
      socket.send(
          'xmpp.login.anonymous',
          { jid: '@anonymous.localhost' }
      )
  }

  socket.on('xmpp.connection', function(data) {
      console.log('Connected as', data.jid)
      window.jid = data.jid
      getRoomList()
  })

  var getRoomList = function() {
      var request = { of: 'chat.localhost' }
      socket.send('xmpp.discover.items', request, function(error, items) {
          console.log('Received room list', error, items)
          var list = $('#room-list ul')
          /* Remove our placeholder */
          list.find('li').remove()
          items.forEach(function(item) {
              /* Only show the room name */
              var li = $('<li/>')
                  .attr('data-jid', item.jid)
                  .text(item.name)
                  .appendTo(list)
          })
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

  $(document).on('click', '#room-list li', function(e) {
      /* Clear any existing selected rooms */
      $('#room-list li.selected').attr('class', '')
      $(e.target).attr('class', 'selected')
      console.log('Chosen room is now', $(e.target).attr('data-jid'))
  })

  $('#room-list button').click(function() {
      var chosenRoom = $('#room-list li.selected')
      var nickname = $('#room-list input').val()
      if (0 === chosenRoom.length) {
          return alert('You must select a room')
      }
      if (!nickname) {
          return alert('You must enter a nickname')
      }
      var roomJid = chosenRoom.attr('data-jid')
      joinChatRoom(roomJid, nickname)
  })

  var joinChatRoom = function(roomJid, nickname) {
      var request = {
          room: roomJid,
          nick: nickname
      }
      window.mucDetails = request
      socket.send('xmpp.muc.join', request)
  }
 
  socket.on('xmpp.muc.error', function(e) {
      console.error('Chat room error', e)
      if (e.error.condition === 'conflict') {
          return alert('Nickname already in use')
      }
      alert('Chat room error: ' + e.error.condition)
  })

  socket.on('xmpp.muc.roster', function(user) {
      showChatWindow() 
      addUser(user)
  })

  var showChatWindow = function() {
    var isDisplayed = $('#chat-window').is(':visible')
    if (isDisplayed) return; /* Chat window is visible */
    $('#room-list').css('display', 'none')
    $('#chat-window').css('display', 'block')
  }

  var addUser = function(user) {
    /* remove the placeholder */
    $('li[data-role="placeholder"]').remove()
    var userEntry = $('.user-list li[data-nick="' + user.nick + '"]')
    if (0 === userEntry.length) return newUser(user)
    if ('none' === user.role) return removeUser(userEntry)
    /* Otherwise we have nothing to do */
  }

  var newUser = function(user) {
    cssClass = ''
    if (user.status && (-1 !== user.status.indexOf(110))) {
      cssClass = 'current-user'
    }
    entry = '<li data-nick="' + user.nick
      + '" class="' + cssClass + '">'
      + user.nick + '</li>'
    $('.user-list ul').append(entry)
  }

  var removeUser = function(user) {
    user.remove()
  }

  var addMessage = function(message) {
    if (!message.content) return /* ignore non-content messages */
    var cssClass = ''
    if (message.private) cssClass += ' muc-private'
    if (message.nick === window.mucDetails.nick) {
      cssClass += ' muc-current-user'
    }
    var dt = $('<dt class="' + cssClass + '"/>')
    dt.text(message.nick)
    var dd = $('<dd class="' + cssClass + '"/>')
    dd.text(message.content)
    /* If the message mentions us, highlight it */
    var regex = new RegExp(window.mucDetails.nick, 'gi')
    var replace = '<strong>' + window.mucDetails.nick + '</strong>'
    dd.html(dd.html().replace(regex, replace))
    $('.chat dl').append(dt)
    $('.chat dl').append(dd)
    /* Scroll to bottom of chat area */
    $('.chat').scrollTop($('.chat')[0].scrollHeight)
  } 

  socket.on('xmpp.muc.message', addMessage)

  $('#chat-window button').click(function() {
    var chatMsg = $('.post textarea')
    if (!chatMsg.val()) return
    var message = {
      room: window.mucDetails.room,
      content: chatMsg.val()
    }
    socket.send('xmpp.muc.message', message)
    chatMsg.val('')
  })

})
