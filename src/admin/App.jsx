import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Provedores from './contexts/Provedores.jsx';
import { rotas } from './routes.jsx';
import { basenameDe } from './utils/basename.js';

const roteador = createBrowserRouter(rotas, { basename: basenameDe(import.meta.env.BASE_URL) });

export default function App() {
  return (
    <Provedores>
      <RouterProvider router={roteador} />
    </Provedores>
  );
}
