import {Router} from 'express'
import AuthAdmin from '../middlewares/authAdmin.js'

import carrinhoController from '../carrinho/carrinho.controller.js'
import produtosController from '../produtos/produtos.controller.js'

const rotas = Router()

rotas.post('/produtos', AuthAdmin, produtosController.adicionar)
rotas.get('/produtos',produtosController.listar)

rotas.post('/adicionarItem',carrinhoController.adicionarItem)
rotas.post('/removerItem',carrinhoController.removerItem)
rotas.get('/carrinho/:usuarioId',carrinhoController.listar)
rotas.delete('/carrinho/:usuarioId',carrinhoController.remover)


export default rotas