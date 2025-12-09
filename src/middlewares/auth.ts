import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
// Importe Request, Response e NextFunction do Express
import { Request, Response, NextFunction } from "express"; 

// Isso garante que body, params e headers sejam herdados.
export interface AutenticacaoRequest extends Request<any, any, any, any> { 
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

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        req.usuarioId = decoded.id;
        req.tipoUsuario = decoded.tipoUsuario;
        next();
    } catch (error) {
        return res.status(401).json({ mensagem: "Token inválido" });
    }
}

export default Auth;