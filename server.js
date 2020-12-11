const through2 = require('through2')
const net = require('net')
const { EventEmitter } = require('events')

const BANNER = require('./assets/banner').banner

// const GLOBAL_PUB_SUB = new EventEmitter()

const PORT = 4444

const connectionStages = {
  NEW: 'new',
  NEW_USER: 'user',
  LOGIN_PROMPTED: 'login_prompted',
  LOGIN_USER: 'login_user',
  LOGIN_PASSWORD: 'login_password'
}

const loginPrompt = `
Enter your account name or "new" to create a new account
`

const passwordPrompt = `
Enter password
`

const server = net.createServer((socket) => {
  const connection = new Connection()
  connection.on('line', (line) => {
    socket.write(`${line}\n`)
  })

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

class BannerProcessor extends EventEmitter {
  process (_state, _line) {
    this.emit('line', BANNER)
    this.emit('processor:change', new LoginProcessor())
  }
}

class LoginProcessor extends EventEmitter {
  constructor () {
    super()
    this.stage = connectionStages.NEW
    this.userInfo = {}
  }

  async validateUserExists () {
    return true
  }

  async authenticateUser () {
    return false
  }

  process (_state, line) {
    switch (this.stage) {
      case connectionStages.NEW:
        this.stage = connectionStages.LOGIN_PROMPTED
        this.emit('line', loginPrompt)
        break
      case connectionStages.LOGIN_PROMPTED:
        this.userInfo.username = line
        this.stage = connectionStages.LOGIN_PASSWORD
        this.emit('line', passwordPrompt)
        break
      case connectionStages.LOGIN_PASSWORD:
        this.userInfo.password = line
        this.emit('line', 'password accepted')
        this.emit('state:change', { userInfo: this.userInfo })
        this.emit('processor:change', new MessagesProcessor())
        break
    }
  }
}

class MessagesProcessor extends EventEmitter {
  process (state, _line) {
    this.emit('line', `Not implemented yet -> ${state.userInfo.username}`)
  }
}
class Connection extends EventEmitter {
  constructor () {
    super()
    this.state = {}
    this.processor = new BannerProcessor()
  }

  set processor (val) {
    if (this._processor) {
      this._processor.removeAllListeners('processor:change')
      this._processor.removeAllListeners('line')
      this._processor.removeAllListeners('state:change')
      this._processor.removeAllListeners('advance')
    }

    this._processor = val
    this._processor.on('processor:change', (processor) => {
      this.processor = processor
    })

    this._processor.on('line', (line) => {
      this.emit('line', line)
    })

    this._processor.on('state:change', (changes) => {
      this.state = { ...this.state, ...changes }
    })

    process.nextTick(() => {
      this.process()
    })
  }

  get processor () {
    return this._processor
  }

  async process (line) {
    this.processor.process(this.state, line)
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
