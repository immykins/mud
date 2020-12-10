const through2 = require('through2')
const net = require('net')
const { EventEmitter } = require('events')
const { connect } = require('http2')

const GLOBAL_PUB_SUB = new EventEmitter()

const server = net.createServer((socket) => {
  const connection = new Connection()
  connection.on('line', (line) => {
    console.log('listener')
    socket.write(`${line}\n`)
  })
  connection.process()
  const stream = through2(function (data, _encoding, next) {
    console.log(data.toString())
    this.push(data)
    next()
  })
  socket.pipe(stream).pipe(socket)
})

server.listen(8801, () => {
  console.log("Server running on port 8801")
})

const connectionStages = {
  NEW: 'new',
  PROMPTED: 'prompted',
  NEW_USER: 'user',
  LOGIN_PROMPT: 'login_prompted',
  LOGIN_USER: 'login_user',
  LOGIN_PASSWORD: 'login_password'
}

class Connection extends EventEmitter {
  constructor() {
    super()
    this.state = { connectionStage: connectionStages.NEW }
  }

  get stage() {
    return this.state.connectionStage
  }

  set stage(state) {
    this.state.connectionStage = state
  }

  line(line) {
    this.emit('line', line)
  }

  async validateUser() {

  }

  async process(line) {
    console.log("process") // line is undefined here on initial connection
    switch (this.stage) {
      case connectionStages.NEW:
        this.stage = connectionStages.PROMPTED
        this.line('would you like to log in or create a new user ? ')
        break
      case connectionStages.PROMPTED:
        if (line == "login") {
          this.stage = connectionStages.LOGIN_PROMPT
          this.process()
        } else if (line == "new") {
          this.stage = connectionStages.NEW_USER
          this.process()
        } else {
          this.line('valid commands are login or new')
        }
        break
      case connectionStages.LOGIN_PROMPT:
        this.stage = connectionStages.LOGIN_USER
        this.state.userInfo = {}
        this.line('username:')
        break
      case connectionStages.NEW_USER:
        this.line('')
        break
      case connectionStages.LOGIN_USER:
        this.state.userInfo.user = line
        this.stage = connectionStages.LOGIN_PASSWORD
        this.line('password:')
        break
      case connectionStages.LOGIN_PASSWORD:
        // this.line()
        this.state.userInfo.password = line
        const userID = await this.validateUser(this.state.userInfo)
        if (userID) {
          delete this.state.userInfo
          this.state.userID = userID
          GLOBAL_PUB_SUB.on(`user_${userID}`, this.line.bind(this))
        } else {
          this.line('login failed')
          this.stage = connectionStages.LOGIN_PROMPT
          this.process()
        }
        break
    }
  }
}

// next directions:
// - main event loop
// - database integration
// - sending events to all users in a room (so maintain user/room state)
// - logout flow
// - mobs
// - lottery + economy
// - npc's (and merchant npc)