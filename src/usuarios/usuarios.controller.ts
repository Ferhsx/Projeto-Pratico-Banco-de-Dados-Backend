import { Request, Response } from 'express'
import { db } from '../database/banco-mongo.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
class UsuariosController {
    async adicionar(req: Request, res: Response) {
        const { nome, idade, email, senha, role = 'user' } = req.body
        if (!nome || !idade || !email || !senha)
            return res.status(400).json({ error: "Nome, idade, email e senha são obrigatórios" })
        if (senha.length < 6)
            return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" })
        if (!email.includes('@') || !email.includes('.'))
            return res.status(400).json({ error: "Email inválido" })
        if (role !== 'user' && role !== 'admin')
            return res.status(400).json({ error: "Tipo de usuário inválido. Use 'user' ou 'admin'" })

        const senhaCriptografada = await bcrypt.hash(senha, 10)
        const usuario = { 
            nome, 
            idade, 
            email, 
            senha: senhaCriptografada, 
            role, 
            dataCriacao: new Date() 
        }

        const resultado = await db.collection('usuarios').insertOne(usuario)
        res.status(201).json({nome,idade,email,_id: resultado.insertedId })
    }
    async listar(req: Request, res: Response) {
        const usuarios = await db.collection('usuarios').find().toArray()
        const usuariosSemSenha = usuarios.map(({ senha, ...resto }) => resto)
        res.status(200).json(usuariosSemSenha)
    }

    async login(req: Request, res: Response) {
        const {email, senha} = req.body
        if(!email || !senha) return res.status(400).json({mensagem:"Email e senha são obrigatórios!"})
    
        //Como verificar se o usuário tem acesso ou não?
        const usuario = await db.collection('usuarios').findOne({email})

        if(!usuario) return res.status(401).json({mensagem:"Usuário Incorreto!"})
        
        const senhaValida = await bcrypt.compare(senha, usuario.senha)

        if(!senhaValida) return res.status(401).json({mensagem:"Senha Incorreta!"})

        // Gerar o token com as informações do usuário
        const token = jwt.sign(
            {
                usuarioId: usuario._id,
                role: usuario.role || 'user' // Garante que sempre terá um valor padrão
            }, 
            process.env.JWT_SECRET || 'seu-segredo-seguro', // Usa um valor padrão para desenvolvimento
            { expiresIn: '1h' }
        )
        
        res.status(200).json({
            token: token,
            user: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role || 'user' // Garante que sempre terá um valor padrão
            }
        })
    }
}

export default new UsuariosController()
