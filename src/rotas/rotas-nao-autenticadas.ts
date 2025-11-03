import {Router} from 'express'

import produtosController from '../produtos/produtos.controller.js'
import usuariosController from '../usuarios/usuarios.controller.js'

const rotas = Router()

rotas.get('/produtos', produtosController.listar) // Adicionar a rota GET para listar produtos

rotas.post('/adicionarUsuario',usuariosController.adicionar)
rotas.post('/login',usuariosController.login)


export default rotas