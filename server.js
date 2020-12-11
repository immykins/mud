const through2 = require('through2')
const net = require('net')
const { EventEmitter } = require('events')
const { connect } = require('http2')

const BANNER = require('./assets/banner').banner

const GLOBAL_PUB_SUB = new EventEmitter()

const PORT = 4444

const server = net.createServer((socket) => {
  const connection = new Connection()
  connection.on('line', (line) => {
    socket.write(`${line}\n`)
  })
  connection.process()
  const stream = through2(async function (data, _encoding, next) {
    const line = data.toString().trim()
    await connection.process(line)
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
    this.loginMachine = new LoginMachine(this.validateUserExists, this.authenticateUser)
  }

  // move these into a separate service that we can inject into Connection
  async validateUserExists() {
    return true
  }

  async authenticateUser() {
    return false
  }

  async process(line) {
    if (!this.state.userInfo) {
      const { response, userInfo } = await this.loginMachine.next()
      this.state.userInfo = userInfo
      this.emit('line', response)
    }
  }
}

const connectionStages = {
  NEW: 'new',
  NEW_USER: 'user',
  LOGIN_PROMPTED: 'login_prompted',
  LOGIN_USER: 'login_user',
  LOGIN_PASSWORD: 'login_password'
}

const login_prompt = `
Enter your account name or "new" to create a new account
`

const password_prompt = `
Enter password
`

// Manages the login flow for a new connection.
class LoginMachine {
  constructor(validateUserFn, authUserFn) {
    this.stage = connectionStages.NEW
    this.validateFn = validateUserFn
    this.authUserFn = authUserFn
  }

  async next() {
    switch (this.stage) {
      case connectionStages.NEW:
        this.stage = connectionStages.LOGIN_PROMPTED
        // TODO: make a text line display API to push lines to
        return { response: [BANNER, login_prompt].join('\n') }
      case connectionStages.LOGIN_PROMPTED:
        // if line is NEW, we advance to NEW_USER
        // else we await this.validateFn(line)
        // if name doesn't exist, we re-prompt for name
        // if it does exist, we advance to LOGIN_PASSWORD
        this.stage = connectionStages.LOGIN_PASSWORD
        return { response: password_prompt }
      case connectionStages.LOGIN_PASSWORD:
        // await this.authUserFn
        // if succeeds:
        return { response: 'password accepted', userInfo: {} }
      // if fails:
      // this.stage = connectionStages.LOGIN_PROMPTED
      // return { response: ['Password incorrect', password_prompt].join('\n')}
      // 
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