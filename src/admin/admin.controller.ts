import { Request, Response } from "express";
import { db } from "../database/banco-mongo.js";

class AdminController {
    
    getDashboardStats = async (req: Request, res: Response) => {
        try {
            const carrinhosAtivos = await db.collection('carrinhos').countDocuments();

            const todosOsCarrinhos = await db.collection('carrinhos').find().toArray();

            const somaTotalCarrinhos = todosOsCarrinhos.reduce(
                (soma, carrinho) => soma + carrinho.total,
                0
            );
            const contagemDeItens = new Map();

            for (const carrinho of todosOsCarrinhos) {
                for (const item of carrinho.itens) {
                    if (!contagemDeItens.has(item.produtoId)) {
                        contagemDeItens.set(item.produtoId, {
                            produtoId: item.produtoId,
                            nome: item.nome,
                            totalVendido: 0,
                            emQuantosCarrinhos: 0
                        });
                    }

                    const stats = contagemDeItens.get(item.produtoId);
                    stats.totalVendido += item.quantidade;
                    stats.emQuantosCarrinhos += 1;
                }
            }

            const rankingItens = Array.from(contagemDeItens.values())
                .sort((a, b) => b.totalVendido - a.totalVendido)
                .slice(0, 5);
            res.status(200).json({
                carrinhosAtivos,
                somaTotalCarrinhos,
                rankingItens
            });

        } catch (error) {
            console.error("Erro ao gerar estatísticas do dashboard:", error);
            res.status(500).json({ mensagem: "Erro interno do servidor" });
        }
    }
}

export default new AdminController();