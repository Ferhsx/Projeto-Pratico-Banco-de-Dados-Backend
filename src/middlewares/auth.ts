//Criar um middleware que bloqueia tudo
import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from "express";
interface AutenticacaoRequest extends Request {
    usuarioId?:string;
    tipoUsuario?: 'admin' | 'comum';
}

function Auth(req:AutenticacaoRequest,res:Response,next:NextFunction){
    console.log("Cheguei no middleware")
    const authHeaders = req.headers.authorization
    console.log(authHeaders)
    if(!authHeaders)
        return res.status(401).json({mensagem:"Você não passou o token no Bearer"})
    const token = authHeaders.split(" ")[1]!

    jwt.verify(token,process.env.JWT_SECRET!,(err,decoded)=>{
        if(err){
            console.log(err)
            return res.status(401).json({mensagem:"Middleware erro token"})
        }
       if(typeof decoded ==="string"||!decoded||!("usuarioId" in decoded) || !("tipoUsuario" in decoded)){
            return res.status(401).json({mensagem:"Middleware erro decoded ou faltando tipo de usuário"})
        }
        req.usuarioId = decoded.usuarioId
        next()
    })

}

export default Auth;