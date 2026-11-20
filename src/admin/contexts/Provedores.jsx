import { ConfirmProvider } from '../../shared/contexts/ConfirmContext.jsx';
import { ToastProvider } from '../../shared/contexts/ToastContext.jsx';
import { MarcaEmpresaProvider } from './MarcaEmpresaContext.jsx';
import { SessaoAdminProvider } from './SessaoAdminContext.jsx';

export default function Provedores({ children }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SessaoAdminProvider>
          <MarcaEmpresaProvider>{children}</MarcaEmpresaProvider>
        </SessaoAdminProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
