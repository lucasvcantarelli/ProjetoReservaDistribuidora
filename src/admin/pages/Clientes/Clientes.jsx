import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import Campo from '../../../shared/components/Campo';
import Paginacao from '../../../shared/components/Paginacao';
import { formatarTelefone } from '../../../shared/utils/formatar.js';
import FalhaDeCarga from '../../components/FalhaDeCarga';
import PaginaAdmin from '../../components/PaginaAdmin';
import TabelaDados from '../../components/TabelaDados';
import { useClientes } from '../../hooks/useClientes.js';
import { useFiltrosDeLista } from '../../hooks/useFiltrosDeLista.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';
import { nomePrincipalCliente } from '../../utils/clienteNome.js';
import estilos from './Clientes.module.css';

const ROTA_CLIENTES = '/clientes';
const ROTA_NOVO = `${ROTA_CLIENTES}/novo`;
const SEM_DADO = '—';
const DICA_BUSCA = 'Busque por empresa, responsável, documento, telefone ou e-mail';

function mensagemVazia(busca, aoCadastrar) {
  if (busca) {
    return {
      titulo: 'Nenhum cliente encontrado.',
      texto: 'Tente outro nome, documento, telefone ou e-mail.',
    };
  }
  return {
    titulo: 'Nenhum cliente cadastrado ainda.',
    texto: 'Cadastre os clientes da empresa para ter os dados de cada um num só lugar.',
    acao: <Botao onClick={aoCadastrar}>Cadastrar primeiro cliente</Botao>,
  };
}

// "12 clientes cadastrados"; com busca, "3 resultados".
function textoContador(total, busca) {
  if (busca) return total === 1 ? '1 resultado' : `${total} resultados`;
  return total === 1 ? '1 cliente cadastrado' : `${total} clientes cadastrados`;
}

const semQuebra = (texto) => <span className={estilos.semQuebra}>{texto || SEM_DADO}</span>;

const cidadeUf = ({ cidade, uf }) => {
  const texto = [cidade, uf].filter(Boolean).join('/');
  return texto || SEM_DADO;
};

function CelulaEmpresa({ cliente }) {
  const principal = nomePrincipalCliente(cliente);
  const fantasia = cliente.tipo_pessoa === 'PJ' ? cliente.nome_fantasia : null;
  return (
    <div className={estilos.celulaNome}>
      <Link to={`${ROTA_CLIENTES}/${cliente.id}`} className={estilos.nome}>
        {principal}
      </Link>
      {fantasia && fantasia !== principal && <span className={estilos.secundario}>{fantasia}</span>}
    </div>
  );
}

const COLUNAS = [
  { chave: 'empresa', titulo: 'Empresa / Cliente', celula: (c) => <CelulaEmpresa cliente={c} /> },
  {
    chave: 'responsavel',
    titulo: 'Responsável',
    celula: (c) => (c.tipo_pessoa === 'PJ' ? c.nome : SEM_DADO),
  },
  { chave: 'cpf_cnpj', titulo: 'CPF/CNPJ', celula: (c) => semQuebra(c.cpf_cnpj) },
  {
    chave: 'telefone',
    titulo: 'Telefone',
    celula: (c) => semQuebra(c.telefone && formatarTelefone(c.telefone)),
  },
  { chave: 'cidade', titulo: 'Cidade/UF', celula: cidadeUf },
];

export default function Clientes() {
  useTituloDaPagina('Clientes');
  const navigate = useNavigate();
  const filtros = useFiltrosDeLista();
  const clientes = useClientes(filtros);
  const { pagina, mudarPagina } = filtros;
  const { carregando, itens, totalPaginas } = clientes;

  // Excluiu o último item de uma página que deixou de existir: volta para a última página.
  useEffect(() => {
    if (!carregando && itens.length === 0 && pagina > totalPaginas) mudarPagina(totalPaginas);
  }, [carregando, itens.length, pagina, totalPaginas, mudarPagina]);

  const acoes = (cliente) => {
    const nome = nomePrincipalCliente(cliente);
    return (
      <>
        <Botao
          variante="texto"
          className={estilos.verFicha}
          aria-label={`Ver ficha de ${nome}`}
          onClick={() => navigate(`${ROTA_CLIENTES}/${cliente.id}`)}
        >
          Ver ficha
        </Botao>
        <Botao
          variante="texto"
          className={estilos.excluir}
          disabled={clientes.excluindo}
          aria-label={`Excluir ${nome}`}
          onClick={() => clientes.excluir(cliente)}
        >
          Excluir
        </Botao>
      </>
    );
  };

  return (
    <PaginaAdmin
      titulo="Clientes"
      acoes={<Botao onClick={() => navigate(ROTA_NOVO)}>Novo cliente</Botao>}
    >
      <div className={estilos.busca} role="search">
        <Campo
          label="Buscar"
          type="search"
          autoComplete="off"
          dica={DICA_BUSCA}
          value={filtros.texto}
          onChange={(e) => filtros.setTexto(e.target.value)}
        />
      </div>
      {clientes.erro ? (
        <FalhaDeCarga erro={clientes.erro} onTentarDeNovo={clientes.recarregar} />
      ) : (
        <>
          {!carregando && clientes.total > 0 && (
            <p className={estilos.contador} aria-live="polite">
              {textoContador(clientes.total, filtros.busca)}
            </p>
          )}
          <TabelaDados
            rotulo="Clientes"
            colunas={COLUNAS}
            itens={itens}
            carregando={carregando}
            vazio={mensagemVazia(filtros.busca, () => navigate(ROTA_NOVO))}
            acoes={acoes}
          />
          {totalPaginas > 1 && (
            <Paginacao pagina={pagina} totalPaginas={totalPaginas} onMudar={mudarPagina} />
          )}
        </>
      )}
    </PaginaAdmin>
  );
}
