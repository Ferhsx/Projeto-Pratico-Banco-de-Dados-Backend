import jwt, { JwtPayload } from 'jsonwebtoken'
import { Request, Response, NextFunction } from "express";

export interface AutenticacaoRequest extends Request {
    usuarioId?: string;
    tipoUsuario?: 'admin' | 'comum';
    body: any;  // Adicionando a propriedade body
    headers: any; // Adicionando a propriedade headers
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