import {Router} from 'express'
// Importe AuthAdmin para proteger as rotas de administrador
import AuthAdmin from '../middlewares/authAdmin.js' 
import Auth from '../middlewares/auth.js';
import carrinhoController from '../carrinho/carrinho.controller.js'
import produtosController from '../produtos/produtos.controller.js'
import usuariosController from '../usuarios/usuarios.controller.js'
import adminController from '../admin/admin.controller.js'

const rotas = Router()

// Isso protege TODAS as rotas abaixo com autenticação 'Auth'
rotas.use(Auth) 

// --- ROTAS DE PRODUTOS ---
// ADICIONAR Produto (POST /produtos) - AGORA PROTEGIDA POR ADMIN
rotas.post('/produtos', AuthAdmin, produtosController.adicionar);
rotas.put('/produtos/:id', AuthAdmin, produtosController.atualizar); 
rotas.delete('/produtos/:id', AuthAdmin, produtosController.excluir); 


// --- ROTAS DE CARRINHO (Protegidas pelo rotas.use(Auth) acima) ---
rotas.post('/adicionarItem', carrinhoController.adicionarItem);
rotas.post('/removerItem', carrinhoController.removerItem);
rotas.get('/carrinho', carrinhoController.listar);

// <-- 1. ROTA CORRIGIDA (para remover o próprio carrinho)
rotas.delete('/carrinho', carrinhoController.remover); 

// <-- 2. ROTA ADICIONADA (para a Tarefa B2)
rotas.patch('/alterarQuantidade', carrinhoController.atualizarQuantidade);

// --- ROTAS DE ADMIN ---
// Essas rotas são protegidas primeiro pelo 'Auth' e DEPOIS pelo 'AuthAdmin'
rotas.get('/carrinhos', AuthAdmin, carrinhoController.listarTodos);
rotas.delete('/carrinho/por-id/:carrinhoId', AuthAdmin, carrinhoController.removerCarrinhoPorId)
rotas.get('/admin/dashboard', AuthAdmin, adminController.getDashboardStats);

export default rotas