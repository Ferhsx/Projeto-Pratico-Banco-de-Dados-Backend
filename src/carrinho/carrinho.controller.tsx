import * as React from 'react';
import { useEffect, useState } from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import './carrinho.controller.css';

interface ItemCarrinho {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  nome: string;
}

interface Carrinho {
  usuarioId: string;
  itens: ItemCarrinho[];
  total: number;
  dataAtualizacao?: string;
}

// Configuração da instância do axios para requisições à API
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

// Interface para o tipo de erro da API
interface ApiError {
  message: string;
  [key: string]: any;
}

// Tipo para a resposta da API de carrinho
interface CarrinhoResponse {
  data: {
    usuarioId: string;
    itens: Array<{
      produtoId: string;
      quantidade: number;
      precoUnitario: number;
      nome: string;
    }>;
    total: number;
    dataAtualizacao?: string;
  };
  status: number;
  statusText: string;
  headers: any;
  config: any;
}

const Carrinho: React.FC = () => {
  const [carrinho, setCarrinho] = useState<Carrinho | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  
  const usuarioId = localStorage.getItem('usuarioId') || '';

  if (!usuarioId) {
    return (
      <div className="carrinho-container">
        <div className="mensagem-erro">Usuário não autenticado. Por favor, faça login.</div>
      </div>
    );
  }

  // Carregar carrinho ao montar o componente
  useEffect(() => {
    const carregarCarrinho = async () => {
      try {
        setCarregando(true);
        setErro(null);
        
        const response = await api.get<Carrinho>(`/carrinho/${usuarioId}`);
        setCarrinho(response.data);
      } catch (error) {
        const axiosError = error as CustomAxiosError;
        if (axiosError.response?.status === 404) {
          setCarrinho({
            usuarioId,
            itens: [],
            total: 0,
            dataAtualizacao: new Date().toISOString()
          });
          setMensagem('Seu carrinho está vazio.');
        } else {
          const errorMessage = axiosError.response?.data?.message || 'Erro ao carregar o carrinho. Tente novamente mais tarde.';
          setErro(errorMessage);
          console.error('Erro ao buscar carrinho:', error);
        }
      } finally {
        setCarregando(false);
      }
    };

    if (usuarioId) {
      carregarCarrinho();
    } else {
      setErro('Usuário não autenticado. Por favor, faça login.');
      setCarregando(false);
    }
  }, [usuarioId]);

  // Função para alterar a quantidade de um item
  const alterarQuantidade = async (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      setErro('A quantidade deve ser maior que zero.');
      return;
    }

    try {
      setErro(null);
      setMensagem(null);
      
      const response = await api.put<Carrinho>(`/carrinho/item/quantidade`, {
        usuarioId,
        produtoId,
        quantidade: novaQuantidade
      });
      
      setCarrinho(response.data);
      setMensagem('Quantidade atualizada com sucesso!');
      setTimeout(() => setMensagem(null), 3000);
    } catch (error) {
      const axiosError = error as CustomAxiosError;
      const errorMessage = axiosError.response?.data?.message || 'Erro ao atualizar quantidade do item.';
      setErro(errorMessage);
      console.error('Erro ao atualizar quantidade:', error);
    }
  };

  // Função para remover um item do carrinho
  const removerItem = async (produtoId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este item do carrinho?')) {
      return;
    }

    try {
      setErro(null);
      setMensagem(null);
      
      const response = await api.delete<Carrinho>(`/carrinho/item/${produtoId}`, {
        data: { usuarioId }
      });
      
      setCarrinho(response.data);
      setMensagem('Item removido com sucesso!');
      setTimeout(() => setMensagem(null), 3000);
    } catch (error) {
      const axiosError = error as CustomAxiosError;
      const errorMessage = axiosError.response?.data?.message || 'Erro ao remover item do carrinho.';
      setErro(errorMessage);
      console.error('Erro ao remover item:', error);
    }
  };

  // Função para limpar o carrinho
  const limparCarrinho = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todo o carrinho?')) {
      return;
    }

    try {
      setErro(null);
      setMensagem(null);
      
      await api.delete(`/carrinho/${usuarioId}`);
      setCarrinho({
        usuarioId,
        itens: [],
        total: 0,
        dataAtualizacao: new Date().toISOString()
      });
      
      setMensagem('Carrinho limpo com sucesso!');
      setTimeout(() => setMensagem(null), 3000);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage = axiosError.response?.data?.message || 'Erro ao limpar o carrinho.';
      setErro(errorMessage);
      console.error('Erro ao limpar carrinho:', error);
    }
  };

  if (carregando) {
    return (
      <div className="carrinho-container">
        <div className="carrinho-carregando">Carregando seu carrinho...</div>
      </div>
    );
  }

  if (!usuarioId) {
    return (
      <div className="carrinho-container">
        <div className="mensagem-erro">Usuário não autenticado. Por favor, faça login.</div>
      </div>
    );
  }

  if (!carrinho) {
    return (
      <div className="carrinho-container">
        <div className="mensagem-aviso">Não foi possível carregar o carrinho.</div>
      </div>
    );
  }

  return (
    <div className="carrinho-container">
      <h2>Meu Carrinho</h2>

      {erro && <div className="mensagem-erro">{erro}</div>}
      {mensagem && <div className="mensagem-sucesso">{mensagem}</div>}

      {!carrinho || carrinho.itens.length === 0 ? (
        <div className="carrinho-vazio">
          <p>{mensagem || 'Seu carrinho está vazio.'}</p>
        </div>
      ) : (
        <>
          <div className="itens-carrinho">
            <table className="tabela-carrinho">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Preço Unitário</th>
                  <th>Quantidade</th>
                  <th>Subtotal</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carrinho.itens.map((item) => (
                  <tr key={item.produtoId}>
                    <td>{item.nome}</td>
                    <td>R$ {item.precoUnitario.toFixed(2)}</td>
                    <td>
                      <div className="quantidade-controle">
                        <button
                          onClick={() => alterarQuantidade(item.produtoId, item.quantidade - 1)}
                          className="btn-quantidade"
                          disabled={item.quantidade <= 1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => {
                            const novaQuantidade = parseInt(e.target.value) || 1;
                            alterarQuantidade(item.produtoId, novaQuantidade);
                          }}
                          className="input-quantidade"
                          min="1"
                        />
                        <button
                          onClick={() => alterarQuantidade(item.produtoId, item.quantidade + 1)}
                          className="btn-quantidade"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>R$ {(item.precoUnitario * item.quantidade).toFixed(2)}</td>
                    <td>
                      <button
                        onClick={() => removerItem(item.produtoId)}
                        className="btn-remover"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="resumo-carrinho">
            <h3>Resumo do Carrinho</h3>
            <div className="total">
              <strong>Total:</strong>
              <strong>R$ {carrinho.total.toFixed(2)}</strong>
            </div>
            <button onClick={limparCarrinho} className="btn-limpar-carrinho">
              Limpar Carrinho
            </button>
            <button className="btn-finalizar-compra">
              Finalizar Compra
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Carrinho;