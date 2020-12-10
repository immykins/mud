const through2 = require('through2')
const net = require('net')
const { EventEmitter } = require('events')
const { connect } = require('http2')

const GLOBAL_PUB_SUB = new EventEmitter()

const PORT = 4444

const server = net.createServer((socket) => {
  const connection = new Connection()
  connection.on('line', (line) => {
    console.log('listener')
    socket.write(`${line}\n`)
  })
  connection.process()
  const stream = through2(async function (data, _encoding, next) {
    const line = data.toString().trim()
    await connection.process(line)
    // lines.forEach((line) => {
    //   this.push(line)
    // })
    next()
  })
  socket.pipe(stream).pipe(socket)
})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

class Connection extends EventEmitter {
  constructor() {
    super()
    this.state = {}
    // this.state = { connectionStage: connectionStages.NEW }
    this.loginMachine = new LoginMachine(this.validateUser)
  }

  // get stage() {
  //   return this.state.connectionStage
  // }

  // set stage(state) {
  //   this.state.connectionStage = state
  // }

  // line(line) {
  //   this.emit('line', line)
  // }

  async validateUser() {

  }

  async process(line) {
    if (!this.state.userInfo) {
      // returns { lines: [],  }
      // const response = this.loginMachine.next()
      const { response, userInfo } = this.loginMachine.next()
      console.log(`response is ${response}`)
      this.emit('line', response)
    }
    // switch (this.stage) {
    //   case connectionStages.NEW:
    //     this.stage = connectionStages.PROMPTED
    //     this.line('would you like to log in or create a new user ? ')
    //     break
    //   case connectionStages.PROMPTED:
    //     if (line == "login") {
    //       this.stage = connectionStages.LOGIN_PROMPT
    //       this.process()
    //     } else if (line == "new") {
    //       this.stage = connectionStages.NEW_USER
    //       this.process()
    //     } else {
    //       this.line('valid commands are login or new')
    //     }
    //     break
    //   case connectionStages.LOGIN_PROMPT:
    //     this.stage = connectionStages.LOGIN_USER
    //     this.state.userInfo = {}
    //     this.line('username:')
    //     break
    //   case connectionStages.NEW_USER:
    //     this.line('')
    //     break
    //   case connectionStages.LOGIN_USER:
    //     this.state.userInfo.user = line
    //     this.stage = connectionStages.LOGIN_PASSWORD
    //     this.line('password:')
    //     break
    //   case connectionStages.LOGIN_PASSWORD:
    //     // this.line()
    //     this.state.userInfo.password = line
    //     const userID = await this.validateUser(this.state.userInfo)
    //     if (userID) {
    //       delete this.state.userInfo
    //       this.state.userID = userID
    //       GLOBAL_PUB_SUB.on(`user_${userID}`, this.line.bind(this))
    //     } else {
    //       this.line('login failed')
    //       this.stage = connectionStages.LOGIN_PROMPT
    //       this.process()
    //     }
    //     break
    // }
  }
}

const connectionStages = {
  NEW: 'new',
  PROMPTED: 'prompted',
  NEW_USER: 'user',
  LOGIN_PROMPT: 'login_prompted',
  LOGIN_USER: 'login_user',
  LOGIN_PASSWORD: 'login_password'
}

// maintains the current login state and FSM logic
class LoginMachine {
  constructor(validateFn) {
    this.stage = connectionStages.NEW
    this.validateFn = validateFn
  }

  next() {
    console.log('next')
    switch (this.stage) {
      case connectionStages.NEW:
        console.log("new")
        this.stage = connectionStages.PROMPTED
        return { response: 'would you like to log in or create a new user ?' }
      case connectionStages.PROMPTED:
        console.log("prompted")
        // { line: }
        this.stage = connectionStages.LOGIN_PROMPT
        return { response: 'idk' }
      // case connectionStages.NEW_USER:
      // this.stage = connectionStages.LOGIN_U
      // break
      case connectionStages.LOGIN_PROMPT:
        this.stage = connectionStages.LOGIN_USER
        return { response: 'enter username:' }
      case connectionStages.LOGIN_USER:
        this.stage = connectionStages.LOGIN_PASSWORD
        return { response: 'enter password' }
      case connectionStages.LOGIN_PASSWORD:
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