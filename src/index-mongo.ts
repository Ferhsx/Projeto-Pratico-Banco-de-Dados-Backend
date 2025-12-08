import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import rotasNaoAutenticadas from './rotas/rotas-nao-autenticadas.js';
import rotasAutenticadas from './rotas/rotas-autenticadas.js';
import Auth from './middlewares/auth.js';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;

// Configuração do CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://seu-dominio.com'] 
    : ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Middleware de segurança
app.use((req: Request, res: Response, next: NextFunction) => {
  // Headers de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "connect-src 'self' https://api.stripe.com; " +
    "frame-src 'self' https://js.stripe.com;"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissões de recursos
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
});

// Rotas que NÃO precisam de autenticação
app.use(rotasNaoAutenticadas);

// Middleware de autenticação
app.use(Auth);

// Rotas que PRECISAM de autenticação
app.use(rotasAutenticadas);

// Rota de verificação de saúde
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tratamento de erros global
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicialização do servidor
if (process.env.NODE_ENV === 'production') {
  // Em produção, use HTTPS com certificado real
  app.listen(port, () => {
    console.log(`Servidor rodando em produção na porta ${port}`);
  });
} else {
  // Em desenvolvimento, use HTTPS com certificado autoassinado
  const certsPath = path.join(__dirname, '..', 'certs');
  const httpsOptions = {
    key: fs.readFileSync(path.join(certsPath, 'key.pem')),
    cert: fs.readFileSync(path.join(certsPath, 'cert.pem'))
  };
  
  https.createServer(httpsOptions, app).listen(port, () => {
    console.log(`Servidor HTTPS de desenvolvimento rodando na porta ${port}`);
    console.log('Acesse: https://localhost:' + port);
  });
}