import { Request, Response } from 'express'
import { getDb } from '../database/banco-mongo.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { ObjectId } from 'bson'

// Interface para tipar o payload do token corretamente
interface TokenPayload {
    usuarioId: string;
    tipoUsuario: string;
}

class UsuariosController {
    
    // --- CADASTRO (ADICIONAR) ---
    async adicionar(req: Request, res: Response) {
        const { nome, idade, email, senha, tipoUsuario } = req.body;
        
        // Validações básicas
        if (!nome || !idade || !email || !senha) {
            return res.status(400).json({ error: "Nome, idade, email e senha são obrigatórios" });
        }
        if (senha.length < 6) {
            return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" });
        }
        
        const { db } = await getDb();
        const usuarioExistente = await db.collection('usuarios').findOne({ email });
        
        if (usuarioExistente) {
            return res.status(400).json({ error: "Email já cadastrado" });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);
        
        // Objeto base do usuário
        const novoUsuario = { 
            nome, 
            idade, 
            email, 
            senha: senhaCriptografada, 
            tipoUsuario: 'comum', // Padrão seguro
        };

        // Lógica para criar ADMIN
        if (tipoUsuario === 'admin') {
            const token = req.headers.authorization?.split(' ')[1];
            
            // Se não tiver token, barra imediatamente
            if (!token) {
                // Se for o PRIMEIRO admin, isso aqui impede. 
                // Solução: Crie como 'comum' e mude no banco, ou remova essa trava apenas no primeiro setup.
                return res.status(401).json({ error: "Criação de admin requer autenticação de outro admin." });
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as TokenPayload;
                
                // 🚨 CORREÇÃO AQUI: Usar 'usuarioId' em vez de 'id'
                const usuarioAdmin = await db.collection('usuarios').findOne({ _id: new ObjectId(decoded.usuarioId) });
                
                if (!usuarioAdmin || usuarioAdmin.tipoUsuario !== 'admin') {
                    return res.status(403).json({ error: "Apenas administradores podem criar novos administradores" });
                }
                
                // Autorizado!
                novoUsuario.tipoUsuario = 'admin';
            } catch (error) {
                return res.status(401).json({ error: "Token inválido ou expirado" });
            }
        }

        const resultado = await db.collection('usuarios').insertOne(novoUsuario);
        
        // Remove a senha do retorno
        const { senha: _, ...usuarioSemSenha } = novoUsuario;
        res.status(201).json({ ...usuarioSemSenha, _id: resultado.insertedId });
    }

    // --- PROMOVER/REBAIXAR USUÁRIO ---
    async atualizarTipoUsuario(req: Request, res: Response) {
        const { usuarioId } = req.params;
        const { tipoUsuario } = req.body;

        if (!tipoUsuario || !['admin', 'comum'].includes(tipoUsuario)) {
            return res.status(400).json({ error: "Tipo de usuário inválido. Use 'admin' ou 'comum'." });
        }

        // Essa função deve ser protegida por rota, mas se validar aqui também, ok.
        // O ideal é usar o middleware AuthAdmin na rota, mas vamos corrigir sua lógica manual:
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Token necessário" });

        try {
            const { db } = await getDb();
            const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as TokenPayload;
            
            // 🚨 CORREÇÃO AQUI: Usar 'usuarioId'
            const usuarioAdmin = await db.collection('usuarios').findOne({ _id: new ObjectId(decoded.usuarioId) });
            
            if (!usuarioAdmin || usuarioAdmin.tipoUsuario !== 'admin') {
                return res.status(403).json({ error: "Apenas admins podem fazer isso." });
            }

            const resultado = await db.collection('usuarios').updateOne(
                { _id: new ObjectId(usuarioId) },
                { $set: { tipoUsuario } }
            );

            if (resultado.matchedCount === 0) return res.status(404).json({ error: "Usuário alvo não encontrado" });

            res.status(200).json({ mensagem: `Usuário atualizado para ${tipoUsuario}` });

        } catch (error) {
            res.status(500).json({ error: "Erro interno ou token inválido" });
        }
    }

    // --- LOGIN ---
    async login(req: Request, res: Response) {
        const {email, senha} = req.body
        if(!email || !senha) return res.status(400).json({mensagem:"Dados incompletos"})
    
        const { db } = await getDb();
        const usuario = await db.collection('usuarios').findOne({email})

        if(!usuario) return res.status(401).json({mensagem:"Credenciais inválidas"})
        
        const senhaValida = await bcrypt.compare(senha, usuario.senha)
        if(!senhaValida) return res.status(401).json({mensagem:"Credenciais inválidas"})

        const tipoUsuario = usuario.tipoUsuario || 'comum';
        
        // Gera o token
        const token = jwt.sign( 
            { usuarioId: usuario._id, tipoUsuario: tipoUsuario }, 
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        )

        res.status(200).json({ 
            token: token,
            tipoUsuario: tipoUsuario,
            nome: usuario.nome,
            usuarioId: usuario._id
        })
    }
    
    // --- LISTAR ---
    async listar(req: Request, res: Response) {
        // ... (seu código estava ok aqui)
        const { db } = await getDb();
        const usuarios = await db.collection('usuarios').find().toArray()
        // Remove senha de todos
        const usuariosSemSenha = usuarios.map(({ senha, ...resto }) => resto)
        res.status(200).json(usuariosSemSenha)
    }
}

export default new UsuariosController()