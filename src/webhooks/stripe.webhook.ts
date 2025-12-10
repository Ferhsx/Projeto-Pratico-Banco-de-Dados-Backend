import { Request, Response } from 'express';
import Stripe from 'stripe';
import { ObjectId } from 'bson';
import { getDb } from '../database/banco-mongo.js';

interface ItemCarrinho {
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
    nome: string;
}

interface Carrinho {
    _id: ObjectId;
    usuarioId: string;
    itens: ItemCarrinho[];
    dataAtualizacao: Date;
    total: number;
    status?: string;
    finalizadoEm?: Date;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Função para processar eventos do webhook
export const handleStripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
        console.error('STRIPE_WEBHOOK_SECRET não configurado');
        return res.status(500).json({ error: 'Configuração do webhook não encontrada' });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            endpointSecret
        );
    } catch (err: any) {
        console.error('Erro ao verificar assinatura do webhook:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Lidar com diferentes tipos de eventos
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            await handleSuccessfulPayment(paymentIntent);
            break;
        
        case 'payment_intent.payment_failed':
            const paymentFailed = event.data.object as Stripe.PaymentIntent;
            console.log('Pagamento falhou:', paymentFailed.id);
            // Aqui você pode adicionar lógica para notificar o usuário sobre a falha
            break;
            
        default:
            console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
};

// Função para processar pagamento bem-sucedido
async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
    try {
        const { metadata } = paymentIntent;
        const { usuarioId, carrinhoId } = metadata;

        if (!usuarioId || !carrinhoId) {
            console.error('Metadados ausentes no pagamento:', paymentIntent.id);
            return;
        }

        // 1. Buscar o carrinho
        const { db } = await getDb();
        const carrinho = await db.collection<Carrinho>('carrinhos').findOne({ 
            _id: new ObjectId(carrinhoId) 
        });
        
        if (!carrinho) {
            console.error('Carrinho não encontrado:', carrinhoId);
            return;
        }

        const pedido = {
            usuarioId,
            itens: carrinho.itens,
            valorTotal: paymentIntent.amount / 100, // Converter de centavos para reais
            status: 'pago',
            dataPagamento: new Date(),
            metodoPagamento: 'cartao',
            idPagamento: paymentIntent.id,
            enderecoEntrega: null, // Adicione os dados de entrega se disponíveis
            criadoEm: new Date(),
            atualizadoEm: new Date()
        };

        // 2. Salvar o pedido no banco de dados
        const pedidoResult = await db.collection('pedidos').insertOne(pedido);

        // 3. Limpar o carrinho ou marcá-lo como finalizado
        const updateResult = await db.collection<Carrinho>('carrinhos').updateOne(
            { _id: new ObjectId(carrinhoId) },
            { 
                $set: { 
                    status: 'finalizado',
                    finalizadoEm: new Date(),
                    atualizadoEm: new Date(),
                    itens: [] // Limpa os itens do carrinho
                }
            }
        );

        if (!pedidoResult.acknowledged || !updateResult.acknowledged) {
            throw new Error('Falha ao processar o pedido');
        }

        console.log(`Pedido criado e carrinho finalizado para o usuário ${usuarioId}`);

    } catch (error) {
        console.error('Erro ao processar pagamento bem-sucedido:', error);
        // Em um ambiente de produção, você deve ter um sistema de logging mais robusto
        // e possivelmente uma fila de retentativa para erros
    }
}
