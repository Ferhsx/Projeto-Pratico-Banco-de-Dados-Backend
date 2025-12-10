import { Request, Response } from 'express'
import { getDb } from '../database/banco-mongo.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { ObjectId } from 'bson'
class UsuariosController {
    async adicionar(req: Request, res: Response) {
        const { nome, idade, email, senha, tipoUsuario } = req.body;
        
        if (!nome || !idade || !email || !senha) {
            return res.status(400).json({ error: "Nome, idade, email e senha são obrigatórios" });
        }
        if (senha.length < 6) {
            return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" });
        }
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ error: "Email inválido" });
        }

        // Verifica se já existe um usuário com o mesmo email
        const { db } = await getDb();
        const usuarioExistente = await db.collection('usuarios').findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ error: "Email já cadastrado" });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);
        
        // Por padrão, novos usuários são 'comum'
        const novoUsuario = { 
            nome, 
            idade, 
            email, 
            senha: senhaCriptografada, 
            tipoUsuario: 'comum' 
        };

        // Se estiver tentando criar um admin, verifica se o solicitante é admin
        if (tipoUsuario === 'admin') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: "Token de autenticação não fornecido" });
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { id: string };
                const usuarioAdmin = await db.collection('usuarios').findOne({ _id: new ObjectId(decoded.id) });
                
                if (!usuarioAdmin || usuarioAdmin.tipoUsuario !== 'admin') {
                    return res.status(403).json({ error: "Apenas administradores podem criar novos administradores" });
                }
                
                // Se chegou aqui, é um admin válido criando outro admin
                novoUsuario.tipoUsuario = 'admin';
            } catch (error) {
                return res.status(401).json({ error: "Token inválido ou expirado" });
            }
        }

        const resultado = await db.collection('usuarios').insertOne(novoUsuario);
        const { senha: _, ...usuarioSemSenha } = novoUsuario;
        res.status(201).json({ ...usuarioSemSenha, _id: resultado.insertedId });
    }

    async atualizarTipoUsuario(req: Request, res: Response) {
        const { usuarioId } = req.params;
        const { tipoUsuario } = req.body;

        if (!tipoUsuario || !['admin', 'comum'].includes(tipoUsuario)) {
            return res.status(400).json({ error: "Tipo de usuário inválido" });
        }

        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: "Token de autenticação não fornecido" });
        }

        try {
            const { db } = await getDb();
            
            // Verifica se quem está fazendo a requisição é admin
            const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { id: string };
            const usuarioAdmin = await db.collection('usuarios').findOne({ _id: new ObjectId(decoded.id) });
            
            if (!usuarioAdmin || usuarioAdmin.tipoUsuario !== 'admin') {
                return res.status(403).json({ error: "Apenas administradores podem alterar tipos de usuário" });
            }

            // Atualiza o tipo do usuário
            const resultado = await db.collection('usuarios').updateOne(
                { _id: new ObjectId(usuarioId) },
                { $set: { tipoUsuario } }
            );

            if (resultado.matchedCount === 0) {
                return res.status(404).json({ error: "Usuário não encontrado" });
            }

            res.status(200).json({ mensagem: "Tipo de usuário atualizado com sucesso" });
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'JsonWebTokenError') {
                    return res.status(401).json({ error: "Token inválido" });
                }
                if (error.name === 'TokenExpiredError') {
                    return res.status(401).json({ error: "Token expirado" });
                }
            }
            res.status(500).json({ error: "Erro ao atualizar tipo de usuário" });
        }
    }
    async listar(req: Request, res: Response) {
        const { db } = await getDb();
        const usuarios = await db.collection('usuarios').find().toArray()
        const usuariosSemSenha = usuarios.map(({ senha, ...resto }) => resto)
        res.status(200).json(usuariosSemSenha)
    }

    async login(req: Request, res: Response) {
        const {email, senha} = req.body
        if(!email || !senha) return res.status(400).json({mensagem:"Email e senha são obrigatórios!"})
    
        //Como verificar se o usuário tem acesso ou não?
        const { db } = await getDb();
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
