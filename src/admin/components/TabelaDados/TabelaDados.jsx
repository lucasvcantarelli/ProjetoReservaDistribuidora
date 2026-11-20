import Carregando from '../../../shared/components/Carregando';
import estilos from './TabelaDados.module.css';

// Tabela reutilizável das listas do painel. No celular cada linha vira um cartão (o CSS mostra o
// título da coluna ao lado de cada valor, lido de `data-rotulo`).
// colunas: [{ chave, titulo, celula?(item, indice) }]; acoes?(item): botões da linha;
// vazio: { titulo, texto?, acao? } mostrado quando não há itens (`acao`: botão opcional).
export default function TabelaDados({
  rotulo,
  colunas,
  itens,
  carregando = false,
  vazio,
  acoes,
  chaveDe = (item) => item.id,
}) {
  if (carregando) return <Carregando />;
  if (itens.length === 0) {
    return (
      <section className={estilos.vazio}>
        <h2 className={estilos.vazioTitulo}>{vazio.titulo}</h2>
        {vazio.texto && <p className={estilos.vazioTexto}>{vazio.texto}</p>}
        {vazio.acao && <div className={estilos.vazioAcao}>{vazio.acao}</div>}
      </section>
    );
  }

  return (
    <div className={estilos.moldura}>
      <table className={estilos.tabela}>
        <caption className="sr-only">{rotulo}</caption>
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna.chave} scope="col">
                {coluna.titulo}
              </th>
            ))}
            {acoes && (
              <th scope="col" className={estilos.colunaAcoes}>
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => (
            <tr key={chaveDe(item)}>
              {colunas.map((coluna) => (
                <td key={coluna.chave} data-rotulo={coluna.titulo}>
                  {coluna.celula ? coluna.celula(item, indice) : item[coluna.chave]}
                </td>
              ))}
              {acoes && (
                <td className={estilos.celulaAcoes}>
                  <div className={estilos.acoes}>{acoes(item, indice)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
