import { Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RaizAdmin from './components/RaizAdmin';
import RotaAdmin from './components/RotaAdmin';
import Categorias from './pages/Categorias';
import ClienteForm from './pages/ClienteForm';
import Clientes from './pages/Clientes';
import Configuracoes from './pages/Configuracoes';
import Entrar from './pages/Entrar';
import EsqueciSenha from './pages/EsqueciSenha';
import NaoEncontrado from './pages/NaoEncontrado';
import NovaSenha from './pages/NovaSenha';
import Privacidade from './pages/Privacidade';
import ProdutoForm from './pages/ProdutoForm';
import Produtos from './pages/Produtos';

// Caminhos relativos ao basename (VITE_ADMIN_BASE). `/entrar`, `/esqueci-senha`, `/nova-senha` e `/privacidade` abrem sem login.
export const rotas = [
  {
    element: <RaizAdmin />,
    children: [
      { path: '/entrar', element: <Entrar /> },
      { path: '/esqueci-senha', element: <EsqueciSenha /> },
      { path: '/nova-senha', element: <NovaSenha /> },
      { path: '/privacidade', element: <Privacidade /> },
      {
        element: <RotaAdmin />,
        children: [
          {
            element: <Layout />,
            children: [
              { index: true, element: <Navigate to="/categorias" replace /> },
              { path: '/categorias', element: <Categorias /> },
              { path: '/produtos', element: <Produtos /> },
              { path: '/produtos/novo', element: <ProdutoForm /> },
              { path: '/produtos/:id', element: <ProdutoForm /> },
              { path: '/clientes', element: <Clientes /> },
              { path: '/clientes/novo', element: <ClienteForm /> },
              { path: '/clientes/:id', element: <ClienteForm /> },
              { path: '/configuracoes', element: <Configuracoes /> },
            ],
          },
        ],
      },
      { path: '*', element: <NaoEncontrado /> },
    ],
  },
];
