# Rede Social - Server

API feita com **json-server** + **json-server-auth**, simulando um back-end
completo com cadastro, login e posts protegidos por token.

## Como rodar

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000`.

## Rotas principais

| Método | Rota           | O que faz                                   |
|--------|----------------|----------------------------------------------|
| POST   | /register      | Cria um usuário (email, password + campos extras: name, username, avatar) |
| POST   | /login         | Faz login, retorna `accessToken` e `user`     |
| GET    | /posts         | Lista os posts (precisa estar logado)         |
| POST   | /posts         | Cria um post (precisa estar logado)           |
| GET    | /posts?userId=X| Lista posts de um usuário específico          |
| PATCH  | /posts/:id     | Atualiza um post (ex: dar like)               |

Em toda requisição protegida, mandar o header:
```
Authorization: Bearer SEU_TOKEN_AQUI
```

