// src/admin/admin.controller.ts
import { Request, Response } from "express";
import { getDb } from "../database/banco-mongo.js";

class AdminController {
    
    getDashboardStats = async (req: Request, res: Response) => {
        try {
            const { db } = await getDb();

            // 1. Contar carrinhos ativos (pessoas comprando agora)
            // Filtra por status diferente de 'finalizado' para pegar quem ainda está comprando
            const carrinhosAtivos = await db.collection('carrinhos').countDocuments({ status: { $ne: 'finalizado' } });

            // 2. Buscar histórico de vendas (PEDIDOS) para faturamento e ranking
            const pedidosRealizados = await db.collection('pedidos').find().toArray();

            // Calcular Faturamento Total (Soma do valorTotal dos pedidos)
            const faturamentoTotal = pedidosRealizados.reduce(
                (soma, pedido) => soma + (pedido.valorTotal || 0),
                0
            );

            // Calcular Ranking de Produtos Vendidos
            const contagemDeItens = new Map();

            for (const pedido of pedidosRealizados) {
                // Verifica se o pedido tem itens antes de iterar
                if (pedido.itens && Array.isArray(pedido.itens)) {
                    for (const item of pedido.itens) {
                        const idProduto = item.produtoId || item._id; // Garante pegar o ID certo
                        
                        if (!contagemDeItens.has(idProduto)) {
                            contagemDeItens.set(idProduto, {
                                produtoId: idProduto,
                                nome: item.nome,
                                totalVendido: 0,
                                pedidos: 0 // Em quantos pedidos apareceu
                            });
                        }

                        const stats = contagemDeItens.get(idProduto);
                        // Soma a quantidade vendida (se não tiver quantidade, assume 1)
                        stats.totalVendido += (item.quantidade || item.qtd || 1);
                        stats.pedidos += 1;
                    }
                }
            }

            // Transforma o Map em Array, ordena por mais vendidos e pega o Top 5
            const rankingItens = Array.from(contagemDeItens.values())
                .sort((a, b) => b.totalVendido - a.totalVendido)
                .slice(0, 5);

            res.status(200).json({
                carrinhosAtivos,      // Quantas pessoas estão com carrinho aberto agora
                somaTotalCarrinhos: faturamentoTotal, // Quanto você já faturou de verdade
                rankingItens          // O que foi realmente vendido
            });

        } catch (error) {
            console.error("Erro ao gerar estatísticas do dashboard:", error);
            res.status(500).json({ mensagem: "Erro interno do servidor ao gerar dashboard." });
        }
    }
}

export default new AdminController();