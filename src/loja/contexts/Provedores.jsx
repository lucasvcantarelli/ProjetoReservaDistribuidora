import { ConfirmProvider } from '../../shared/contexts/ConfirmContext.jsx';
import { ToastProvider } from '../../shared/contexts/ToastContext.jsx';
import { CarrinhoProvider } from './CarrinhoContext.jsx';
import { EmpresaProvider } from './EmpresaContext.jsx';

export default function Provedores({ children }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <EmpresaProvider>
          <CarrinhoProvider>{children}</CarrinhoProvider>
        </EmpresaProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
