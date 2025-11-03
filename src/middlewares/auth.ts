// auth.ts

import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from "express";

interface AutenticacaoRequest extends Request {
    usuarioId?: string;
    tipoUsuario?: 'admin' | 'comum';
}

function Auth(req: AutenticacaoRequest, res: Response, next: NextFunction) {
    console.log("Cheguei no middleware")
    const authHeaders = req.headers.authorization
    console.log(authHeaders)

    if (!authHeaders)
        return res.status(401).json({ mensagem: "Você não passou o token no Bearer" })

    const token = authHeaders.split(" ")[1]!

    jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(401).json({ mensagem: "Middleware erro token" })
        }
        
        // 1. **Verificação de segurança e tipo**
        // Garantimos que 'decoded' é um objeto e possui os campos obrigatórios.
        if (typeof decoded === "string" || !decoded || !("usuarioId" in decoded) || !("tipoUsuario" in decoded)) {
            return res.status(401).json({ mensagem: "Token inválido ou faltando dados essenciais (usuarioId ou tipoUsuario)." })
        }

        // 2. **Atribuição Correta**
        // Os dados decodificados são atribuídos diretamente ao objeto req.
        
        // Certifica-se que o tipoUsuario é 'admin' ou 'comum', caso contrário, atribui 'comum'
        const decodedTipoUsuario = (decoded.tipoUsuario === 'admin' || decoded.tipoUsuario === 'comum') 
            ? decoded.tipoUsuario 
            : 'comum';
            
        req.usuarioId = decoded.usuarioId as string;
        req.tipoUsuario = decodedTipoUsuario; // <-- ATRIBUIÇÃO CORRETA
        
        next()
    })

}

export default Auth;