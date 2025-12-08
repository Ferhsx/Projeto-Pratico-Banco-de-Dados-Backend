import {Router, Request, Response} from 'express'
import bodyParser from 'body-parser'
import produtosController from '../produtos/produtos.controller.js'
import usuariosController from '../usuarios/usuarios.controller.js'
import Stripe from 'stripe'
import { handleStripeWebhook } from '../webhooks/stripe.webhook.js'


const rotas = Router()


// Configuração especial para o webhook do Stripe (precisa do body raw)
const stripeWebhookRouter = Router()
stripeWebhookRouter.post('/webhook', 
    bodyParser.raw({ type: 'application/json' }), 
    handleStripeWebhook
)
rotas.use(stripeWebhookRouter)


// Configuração padrão para outras rotas
rotas.use(bodyParser.json())


rotas.get('/produtos', produtosController.listar) // Adicionar a rota GET para listar produtos
rotas.get('/produtos/:id', produtosController.listarPorId)
rotas.post('/cadastro',usuariosController.adicionar)
rotas.post('/login',usuariosController.login)


// Rota para criar PaymentIntent (Stripe)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')


rotas.post('/create-payment-intent', async (req, res) => {
    const { amount, currency = 'brl' } = req.body
    if (!amount) return res.status(400).json({ error: 'amount is required' })
    try {
        const paymentIntent = await stripe.paymentIntents.create({ amount, currency })
        return res.json({ clientSecret: paymentIntent.client_secret })
    } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
}
})


export default rotas