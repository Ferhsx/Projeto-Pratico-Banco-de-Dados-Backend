import {Router} from 'express'
// Importe AuthAdmin para proteger as rotas de administrador
import AuthAdmin from '../middlewares/authAdmin.js' 

import carrinhoController from '../carrinho/carrinho.controller.js'
import produtosController from '../produtos/produtos.controller.js'

const rotas = Router()

// --- ROTAS DE PRODUTOS ---

// ADICIONAR Produto (POST /produtos) - AGORA PROTEGIDA POR ADMIN
rotas.post('/produtos', AuthAdmin, produtosController.adicionar)

// LISTAR Produtos (GET /produtos) - Acessível a qualquer usuário logado
rotas.get('/produtos', produtosController.listar)

// NOVO: EDITAR Produto (PUT /produtos/:id) - PROTEGIDA POR ADMIN
// O :id é o ID do produto que será editado
rotas.put('/produtos/:id', AuthAdmin, produtosController.atualizar) 

// NOVO: EXCLUIR Produto (DELETE /produtos/:id) - PROTEGIDA POR ADMIN
rotas.delete('/produtos/:id', AuthAdmin, produtosController.excluir) 


// --- ROTAS DE CARRINHO (Acessíveis a usuários logados, geralmente comuns) ---
rotas.post('/adicionarItem',carrinhoController.adicionarItem)
rotas.post('/removerItem',carrinhoController.removerItem)
rotas.get('/carrinho/:usuarioId',carrinhoController.listar)
rotas.delete('/carrinho/:usuarioId',carrinhoController.remover)


export default rotas