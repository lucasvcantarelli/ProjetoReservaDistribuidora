import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Provedores from './contexts/Provedores.jsx';
import { rotas } from './routes.jsx';

const roteador = createBrowserRouter(rotas);

export default function App() {
  return (
    <Provedores>
      <RouterProvider router={roteador} />
    </Provedores>
  );
}
