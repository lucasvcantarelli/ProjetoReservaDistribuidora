import LayoutLoja from './components/LayoutLoja';
import Carrinho from './pages/Carrinho';
import Catalogo from './pages/Catalogo';
import Finalizar from './pages/Finalizar';
import NaoEncontrado from './pages/NaoEncontrado';
import Privacidade from './pages/Privacidade';
import Produto from './pages/Produto';

export const rotas = [
  {
    element: <LayoutLoja />,
    children: [
      { path: '/', element: <Catalogo /> },
      { path: '/categoria/:slug', element: <Catalogo /> },
      { path: '/produto/:id', element: <Produto /> },
      { path: '/carrinho', element: <Carrinho /> },
      { path: '/finalizar', element: <Finalizar /> },
      { path: '/privacidade', element: <Privacidade /> },
      { path: '*', element: <NaoEncontrado /> },
    ],
  },
];
