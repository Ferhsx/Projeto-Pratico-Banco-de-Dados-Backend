import { Request, Response } from 'express'
import { db } from '../database/banco-mongo.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { ObjectId } from 'bson'
class UsuariosController {
    async adicionar(req: Request, res: Response) {
        const { nome, idade, email, senha } = req.body
        if (!nome || !idade || !email || !senha)
            return res.status(400).json({ error: "Nome, idade, email e senha são obrigatórios" })
        if (senha.length < 6)
            return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" })
        if (!email.includes('@') || !email.includes('.'))
            return res.status(400).json({ error: "Email inválido" })

        const senhaCriptografada = await bcrypt.hash(senha, 10)
        let tipoUsuario = 'comum' // Usuários criados por essa rota são 'comum' por padrão

        if(email.includes('@admin.com')){
            // Se o email contém '@admin.com', definir como 'admin'
            tipoUsuario = 'admin';
        }
        const usuario = { nome, idade, email, senha: senhaCriptografada, tipoUsuario }  

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

      // 1. **Definir o tipo de usuário (Se não estiver no banco, defina um default 'comum')**
        // OBS: Você deve garantir que 'tipoUsuario' esteja salvo no banco no 'adicionar'
        const tipoUsuario: 'admin' | 'comum' = usuario.tipoUsuario || 'comum';
        
        // 2. **Gerar o token, incluindo o tipoUsuario no payload**
        const token = jwt.sign( 
            { usuarioId: usuario._id, tipoUsuario: tipoUsuario }, // <-- AQUI INCLUÍMOS O tipoUsuario
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        )

        // 3. **Retornar o token E o tipoUsuario**
        res.status(200).json({ 
            token: token,
            tipoUsuario: tipoUsuario, // <-- AQUI RETORNAMOS O TIPO
            nome: usuario.nome,
            usuarioId: usuario._id
        })
    }
}

export default new UsuariosController()
