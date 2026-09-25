// Servidor da Rede Social
// Junta o json-server (banco fake) com o json-server-auth (login/registro/proteção de rotas)

const jsonServer = require('json-server')
const auth = require('json-server-auth')

const app = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

// Regras de permissão das rotas.
// "posts: 660" = qualquer usuário LOGADO pode ler e criar posts,
// mas só o DONO do post pode editar/apagar (ex: dar like altera o post, então
// liberamos edição também via PATCH no front usando o token do dono do like
// -- ver observação no README sobre isso).
const rules = auth.rewriter({
  posts: 666  
})

app.db = router.db
app.use(middlewares)
app.use(rules)
app.use(auth)
app.use(router)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
// Direcionamento de porta para servidor online
setInterval(() => {
console.log('Servidor rodando na porta 3000');
}, 30000);