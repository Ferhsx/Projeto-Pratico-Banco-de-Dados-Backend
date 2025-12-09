import { Request, Response, NextFunction } from "express";

// Reutiliza a interface para garantir que o tipoUsuario esteja presente
interface AutenticacaoRequest extends Request {
    usuarioId?: string;
    tipoUsuario?: 'admin' | 'comum';
}

function AuthAdmin(req: AutenticacaoRequest, res: Response, next: NextFunction) {
    // O middleware Auth (do passo 2) já deve ter sido executado e anexado req.tipoUsuario
    
    // Checa se o usuário é um 'admin'
    if (!req.tipoUsuario || req.tipoUsuario !== 'admin') {
        return res.status(403).json({ mensagem: "Acesso negado: Apenas administradores podem executar esta ação." });
    }
    next();
}

export default AuthAdmin;