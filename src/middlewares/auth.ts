import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from "express";

// Estendendo a interface Request para incluir as propriedades do usuário
declare global {
    namespace Express {
        interface Request {
            usuarioId?: string;
            usuarioRole?: string;
        }
    }
}

// Interface para o payload do token JWT
interface TokenPayload {
    usuarioId: string;
    role: string;
    iat: number;
    exp: number;
}

// Middleware para verificar se o usuário está autenticado
export function auth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ mensagem: "Token não fornecido" });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ mensagem: "Token inválido" });
    }

    const [scheme, token] = parts as [string, string];

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ mensagem: "Formato de token inválido" });
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET não está definido');
        return res.status(500).json({ mensagem: "Erro interno do servidor" });
    }

    try {
        // Forçando a tipagem para evitar erros de tipo
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as unknown as TokenPayload;
        
        if (!decoded.usuarioId || !decoded.role) {
            return res.status(401).json({ mensagem: "Token inválido" });
        }

        req.usuarioId = decoded.usuarioId;
        req.usuarioRole = decoded.role;
        
        return next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ mensagem: "Token expirado" });
        }
        return res.status(401).json({ mensagem: "Token inválido" });
    }
}

// Middleware para verificar se o usuário é admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.usuarioRole === 'admin') {
        return next();
    }
    
    return res.status(403).json({ 
        mensagem: "Acesso negado. Você precisa ser um administrador para acessar este recurso." 
    });
}

export default auth;
