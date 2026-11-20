// Como um cliente aparece nas listas: empresa pela razão social (ou nome fantasia), pessoa física pelo nome.
export function nomePrincipalCliente(cliente) {
  if (cliente.tipo_pessoa === 'PJ') {
    return cliente.razao_social || cliente.nome_fantasia || cliente.nome;
  }
  return cliente.nome;
}
