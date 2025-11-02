import { Router } from 'express';
import { auth, isAdmin } from '../middlewares/auth.js';
import carrinhoController from '../carrinho/carrinho.controller.js';
import produtosController from '../produtos/produtos.controller.js';

const rotas = Router();

// Aplica o middleware de autenticação em todas as rotas
rotas.use(auth);

/**
 * @swagger
 * tags:
 *   name: Produtos
 *   description: Gerenciamento de produtos
 */

// Rotas de produtos
rotas.route('/produtos')
    // Listar produtos (todos os usuários autenticados)
    .get(produtosController.listar)
    // Adicionar produto (apenas admin)
    .post(isAdmin, produtosController.adicionar);

// Rotas de produtos por ID
rotas.route('/produtos/:id')
    // Atualizar produto (apenas admin)
    .put(isAdmin, produtosController.atualizar)
    // Excluir produto (apenas admin)
    .delete(isAdmin, produtosController.excluir);

/**
 * @swagger
 * tags:
 *   name: Carrinho
 *   description: Gerenciamento do carrinho de compras
 */

// Rotas de carrinho
rotas.route('/carrinho')
    // Adicionar item ao carrinho
    .post(carrinhoController.adicionarItem)
    // Remover item do carrinho
    .delete(carrinhoController.removerItem)
    // Atualizar quantidade de itens
    .put(carrinhoController.alterarQuantidade);

// Rota para listar carrinho de um usuário específico
rotas.get('/carrinho/:usuarioId', (req, res, next) => {
    if (req.params.usuarioId !== req.usuarioId && req.usuarioRole !== 'admin') {
        return res.status(403).json({ 
            sucesso: false,
            mensagem: 'Você só pode acessar seu próprio carrinho' 
        });
    }
    next();
}, carrinhoController.listar);

// Rota para limpar carrinho
rotas.delete('/carrinho/limpar/:usuarioId', (req, res, next) => {
    if (req.params.usuarioId !== req.usuarioId && req.usuarioRole !== 'admin') {
        return res.status(403).json({ 
            sucesso: false,
            mensagem: 'Você só pode limpar seu próprio carrinho' 
        });
    }
    next();
}, carrinhoController.remover);

export default rotas;
