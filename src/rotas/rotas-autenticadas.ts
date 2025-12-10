import { Router } from 'express';
import AuthAdmin from '../middlewares/authAdmin.js';
import Auth from '../middlewares/auth.js';
import adminController from '../admin/admin.controller.js';
import carrinhoController from '../carrinho/carrinho.controller.js';
import produtosController from '../produtos/produtos.controller.js';
import usuariosController from '../usuarios/usuarios.controller.js';
import { getDb } from '../database/banco-mongo.js'; 

const rotas = Router();

// Middleware de autenticação para todas as rotas abaixo
rotas.use(Auth);

// --- ROTAS DE CARRINHO ---
rotas.post('/adicionarItem', carrinhoController.adicionarItem);
rotas.post('/removerItem', carrinhoController.removerItem);
rotas.get('/carrinho', carrinhoController.listar);
rotas.delete('/carrinho', carrinhoController.remover); 
rotas.patch('/alterarQuantidade', carrinhoController.atualizarQuantidade);

// --- ROTA DE PAGAMENTO (CORRIGIDA) ---
rotas.post('/criar-pagamento-cartao', async (req, res) => {
    // 1. Receber o paymentMethodId (Token do cartão) que o frontend envia
    const { paymentMethodId } = req.body;
    
    // Obter conexão de forma segura
    const { db, client } = await getDb();
    
    const session = client.startSession();

    try {
        await session.withTransaction(async () => {
            const usuarioId = (req as any).usuarioId;
            if (!usuarioId) throw new Error('Usuário não autenticado.');

            // Validação
            if (!paymentMethodId) {
                throw new Error('Método de pagamento (cartão) não fornecido.');
            }

            // 2. Buscar o carrinho do usuário
            const carrinho = await db.collection('carrinhos').findOne({ 
                usuarioId,
                status: { $ne: 'finalizado' }
            });

            if (!carrinho || !Array.isArray(carrinho.itens) || carrinho.itens.length === 0) {
                throw new Error('Carrinho vazio ou não encontrado.');
            }

            // 3. Calcular o valor total no backend (Segurança)
            const valorTotal = carrinho.itens.reduce((acc: number, item: any) => {
                const preco = typeof item.precoUnitario === 'number' ? item.precoUnitario : (item.preco || 0);
                const qtd = typeof item.quantidade === 'number' ? item.quantidade : (item.qtd || 1);
                return acc + preco * qtd;
            }, 0);

            if (valorTotal <= 0) throw new Error('Valor total inválido.');

            // 4. Criar PaymentIntent no Stripe COM o cartão
            const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY || '');
            
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(valorTotal * 100), // Converter para centavos
                currency: 'brl',
                payment_method: paymentMethodId, // 🚨 AQUI ESTAVA O ERRO: Passar o ID do cartão
                confirm: true, // Tenta cobrar imediatamente
                return_url: 'https://projeto-pratico-frameworks-frontend.vercel.app/pedido-concluido', 
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never'
                },
                metadata: {
                    usuarioId,
                    carrinhoId: carrinho._id?.toString?.() || ''
                }
            });

            // 5. Salvar o Pedido
            const result = await db.collection('pedidos').insertOne({
                usuarioId,
                itens: carrinho.itens,
                valorTotal: valorTotal,
                status: paymentIntent.status === 'succeeded' ? 'pago' : 'pendente',
                dataPagamento: new Date(),
                metodoPagamento: 'cartao',
                idPagamento: paymentIntent.id,
                criadoEm: new Date(),
                atualizadoEm: new Date()
            });
            
            // 6. Finalizar o Carrinho
            await db.collection('carrinhos').updateOne(
                { _id: carrinho._id },
                { 
                    $set: { 
                        status: 'finalizado',
                        finalizadoEm: new Date(),
                        itens: []
                    }
                }
            );

            return res.status(200).json({
                success: true,
                orderId: result.insertedId,
                clientSecret: paymentIntent.client_secret
            });
        });
    } catch (error: any) {
        console.error('Erro ao processar pagamento:', error);
        // Retorna o erro exato do Stripe para o frontend
        return res.status(500).json({ 
            success: false,
            message: error.message || 'Erro ao processar pagamento'
        });
    } finally {
        await session.endSession();
    }
});

// --- ROTAS DE PRODUTOS ---
rotas.post('/produtos', AuthAdmin, produtosController.adicionar);
rotas.put('/produtos/:id', AuthAdmin, produtosController.atualizar); 
rotas.delete('/produtos/:id', AuthAdmin, produtosController.excluir); 

// --- ROTAS DE USUÁRIOS (ADMIN) ---
rotas.patch('/usuarios/:usuarioId/tipo', AuthAdmin, usuariosController.atualizarTipoUsuario);

// --- ROTAS DE ADMIN ---
rotas.get('/carrinhos', AuthAdmin, carrinhoController.listarTodos);
rotas.get('/produtos', AuthAdmin, produtosController.listar);
rotas.get('/admin/dashboard', AuthAdmin, adminController.getDashboardStats);
rotas.get('/admin/usuarios', AuthAdmin, usuariosController.listar);


export default rotas;