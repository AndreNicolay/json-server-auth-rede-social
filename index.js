// Servidor da Rede Social
// Junta o json-server (banco fake) com o json-server-auth (login/registro/proteção de rotas)
// e o Socket.IO (chat em tempo real)

const http = require('http')
const jsonServer = require('json-server')
const auth = require('json-server-auth')
const jwt = require('jsonwebtoken')
const { Server } = require('socket.io')
// Mesma chave que o json-server-auth usa para assinar os tokens
const { JWT_SECRET_KEY } = require('json-server-auth/dist/constants')

const app = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

// Regras de permissão das rotas.
// posts: 660 = qualquer usuário LOGADO pode ler e criar posts, mas só o DONO edita/apaga.
// (Se o like alterar o post via PATCH no front, ajuste esta regra conforme sua necessidade.)
// messages: 400 = só o dono lê via REST; ninguém escreve por REST (só pelo socket).
const rules = auth.rewriter({
  posts: 660,
  messages: 400
})

app.db = router.db

// Valida o token e devolve o id do usuário (ou null)
function idDoToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET_KEY)
    return String(payload.sub)
  } catch {
    return null
  }
}

app.use(middlewares)
app.use(rules)
app.use(auth)

// Histórico de uma conversa: GET /chat/:outroId  (header Authorization: Bearer <token>)
app.get('/chat/:outroId', (req, res) => {
  const meuId = idDoToken((req.headers.authorization || '').replace('Bearer ', ''))
  if (!meuId) return res.status(401).json({ erro: 'não autorizado' })

  const outroId = String(req.params.outroId)
  const mensagens = app.db
    .get('messages')
    .filter(m =>
      (String(m.userId) === meuId && String(m.paraId) === outroId) ||
      (String(m.userId) === outroId && String(m.paraId) === meuId)
    )
    .sortBy('criadaEm')
    .value()

  res.json(mensagens)
})

app.use(router)

// --- Socket.IO ---
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*' } // em produção, troque pelo domínio do seu front
})

// Autenticação no handshake
io.use((socket, next) => {
  const id = idDoToken(socket.handshake.auth.token)
  if (!id) return next(new Error('não autorizado'))
  socket.userId = id
  next()
})

io.on('connection', (socket) => {
  // Sala pessoal: permite entregar a mensagem em várias abas/dispositivos
  socket.join(`user:${socket.userId}`)

  socket.on('mensagem:enviar', ({ paraId, texto } = {}, ack) => {
    if (typeof ack !== 'function') return

    // Validação básica da mensagem
    if (!paraId || typeof texto !== 'string' || !texto.trim() || texto.length > 2000) {
      return ack({ ok: false, erro: 'mensagem inválida' })
    }

    // O destinatário existe?
    const destinatario = app.db.get('users').find({ id: Number(paraId) }).value()
    if (!destinatario) {
      return ack({ ok: false, erro: 'usuário não encontrado' })
    }

    // Impede enviar mensagem para si mesmo
    if (String(paraId) === socket.userId) {
      return ack({ ok: false, erro: 'não é possível enviar para você mesmo' })
    }

    // O remetente vem do token, nunca do cliente
    const msg = app.db.get('messages').insert({
      userId: Number(socket.userId),
      paraId: Number(paraId),
      texto: texto.trim(),
      criadaEm: new Date().toISOString()
    }).write()

    // Entrega ao destinatário e às outras abas do remetente
    io.to(`user:${paraId}`).emit('mensagem:nova', msg)
    socket.to(`user:${socket.userId}`).emit('mensagem:nova', msg)

    ack({ ok: true, mensagem: msg })
  })

  socket.on('digitando', ({ paraId } = {}) => {
    if (!paraId) return
    io.to(`user:${paraId}`).emit('digitando', { deId: socket.userId })
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})

// Direcionamento de porta para servidor online
setInterval(() => {
  console.log(`Servidor rodando na porta ${PORT}`)
}, 30000)