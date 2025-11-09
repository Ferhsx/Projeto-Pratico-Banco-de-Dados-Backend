import {Router} from 'express'
// Importe AuthAdmin para proteger as rotas de administrador
import AuthAdmin from '../middlewares/authAdmin.js' 
import Auth from '../middlewares/auth.js';
import carrinhoController from '../carrinho/carrinho.controller.js'
import produtosController from '../produtos/produtos.controller.js'
import usuariosController from '../usuarios/usuarios.controller.js'
import adminController from '../admin/admin.controller.js'

const rotas = Router()

rotas.use(Auth)
// --- ROTAS DE PRODUTOS ---

// ADICIONAR Produto (POST /produtos) - AGORA PROTEGIDA POR ADMIN
rotas.post('/produtos', AuthAdmin, produtosController.adicionar);
rotas.put('/produtos/:id', AuthAdmin, produtosController.atualizar); 
rotas.delete('/produtos/:id', AuthAdmin, produtosController.excluir); 


// --- ROTAS DE CARRINHO (Agora estarão protegidas e terão acesso a req.usuarioId) ---
rotas.post('/adicionarItem', carrinhoController.adicionarItem);
rotas.post('/removerItem', carrinhoController.removerItem);
rotas.get('/carrinho', carrinhoController.listar);
rotas.delete('/carrinho/:usuarioId', carrinhoController.remover);
rotas.get('/carrinhos', carrinhoController.listarTodos);
rotas.delete('/carrinho/por-id/:carrinhoId', AuthAdmin, carrinhoController.removerCarrinhoPorId)

// --- ROTAS DE USUARIOS ---


// --- ROTAS DE ADMIN ---

rotas.get('/admin/dashboard', AuthAdmin, adminController.getDashboardStats);

export default rotas