import { useFormulario } from '../../shared/hooks/useFormulario.js';

// Estado do formulário de categoria (nova ou edição); `onSalvar` devolve true se deu certo.
export function useFormularioCategoria({ categoria, onSalvar, onFechar }) {
  const formulario = useFormulario({
    nome: categoria?.nome ?? '',
    ativo: categoria?.ativo ?? true,
  });
  const { valores, submeter } = formulario;

  async function salvar(evento) {
    evento.preventDefault();
    const salvou = await submeter(() =>
      onSalvar({ nome: valores.nome.trim(), ativo: valores.ativo }),
    );
    if (salvou) onFechar();
  }

  return { ...formulario, salvar };
}
