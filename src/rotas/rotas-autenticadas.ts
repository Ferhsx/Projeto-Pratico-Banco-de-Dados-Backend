import {Router} from 'express';
import AuthAdmin from '../middlewares/authAdmin.js';
import Auth from '../middlewares/auth.js';
import adminController from '../admin/admin.controller.js';
import carrinhoController from '../carrinho/carrinho.controller.js';
import produtosController from '../produtos/produtos.controller.js';
import Stripe from 'stripe';
import { getDb } from '../database/banco-mongo.js'; 


const rotas = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')


// Isso protege TODAS as rotas abaixo com autenticação 'Auth'
rotas.use(Auth) 


// --- ROTAS DE CARRINHO ---
rotas.post('/adicionarItem', carrinhoController.adicionarItem);
rotas.post('/removerItem', carrinhoController.removerItem);
rotas.get('/carrinho', carrinhoController.listar);
rotas.delete('/carrinho', carrinhoController.remover); 
rotas.patch('/alterarQuantidade', carrinhoController.atualizarQuantidade);


// --- ROTA DE PAGAMENTO (NOVA) ---
rotas.post('/criar-pagamento-cartao', async (req, res) => {
    const { client } = await getDb();
    const session = client.startSession();
    
    try {
        await session.withTransaction(async () => {
            const usuarioId = (req as any).usuarioId;
           if (!usuarioId) {
                throw new Error('Usuário não autenticado.');
            }


            const db = client.db();
            const { ObjectId } = await import('bson');


            // 1. Buscar o carrinho do usuário
            const carrinho = await db.collection('carrinhos').findOne({ 
                usuarioId,
                    status: { $ne: 'finalizado' }
            });


            if (!carrinho || !Array.isArray(carrinho.itens) || carrinho.itens.length === 0) {
                throw new Error('Carrinho vazio ou não encontrado.');
            }


            // 2. Calcular o valor total
            const valorTotal = carrinho.itens.reduce((acc: number, item: any) => {
                const preco = typeof item.precoUnitario === 'number' ? item.precoUnitario : (item.preco || 0);
                const qtd = typeof item.quantidade === 'number' ? item.quantidade : (item.qtd || 1);
                return acc + preco * qtd;
            }, 0);


            if (valorTotal <= 0) {
                throw new Error('Valor total inválido.');
            }


            // 3. Criar PaymentIntent no Stripe
            const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY || '');
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(valorTotal * 100), // Converter para centavos
                currency: 'brl',
                metadata: {
                    usuarioId,
                    carrinhoId: carrinho._id?.toString?.() || ''
                },
                payment_method_types: ['card'],
                confirm: true,
                return_url: req.body.returnUrl || 'http://localhost:3000/pagamento/sucesso'
            });


            // 4. Criar registro do pedido
            const result = await db.collection('pedidos').insertOne({
                usuarioId,
                itens: carrinho.itens,
                valorTotal: valorTotal,
                status: 'pago',
                dataPagamento: new Date(),
                metodoPagamento: 'cartao',
                idPagamento: paymentIntent.id,
                enderecoEntrega: null,
                criadoEm: new Date(),
                atualizadoEm: new Date()
            });
            
            // 5. Marcar o carrinho como finalizado
            await db.collection('carrinhos').updateOne(
                { _id: carrinho._id },
                { 
                    $set: { 
                        status: 'finalizado',
                        finalizadoEm: new Date(),
                        atualizadoEm: new Date(),
                        itens: []
                    }
                }
            );


            // 6. Retornar sucesso
            return res.status(200).json({
                success: true,
                pedidoId: result.insertedId,
                paymentIntentId: paymentIntent.id,
                valorTotal
            });
        });
    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        return res.status(500).json({ 
            success: false,
            mensagem: 'Erro ao processar pagamento', 
            detalhes: (error as Error).message 
        });
    } finally {
        await session.endSession();
    }
});


// --- ROTAS DE PRODUTOS ---
rotas.post('/produtos', AuthAdmin, produtosController.adicionar);
rotas.put('/produtos/:id', AuthAdmin, produtosController.atualizar); 
rotas.delete('/produtos/:id', AuthAdmin, produtosController.excluir); 


// --- ROTAS DE ADMIN ---
rotas.get('/carrinhos', AuthAdmin, carrinhoController.listarTodos);
rotas.get('/produtos', AuthAdmin, produtosController.listar);
rotas.get('/dashboard', AuthAdmin, adminController.getDashboardStats);

export default rotas