// Ícones SVG inline (traço herda a cor do texto); decorativos, por isso aria-hidden.
function Icone({ children, tamanho = 20 }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconeCategorias = () => (
  <Icone>
    <path d="M3 12V4h8l9 9-8 8-9-9z" />
    <circle cx="7.5" cy="8.5" r="1.2" />
  </Icone>
);

export const IconeProdutos = () => (
  <Icone>
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8M12 13v8" />
  </Icone>
);

export const IconeClientes = () => (
  <Icone>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    <path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c1.9.7 3.2 2.3 3.5 5.2" />
  </Icone>
);

export const IconeConfiguracoes = () => (
  <Icone>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
  </Icone>
);

export const IconeSair = () => (
  <Icone>
    <path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9" />
  </Icone>
);

export const IconeMenu = () => (
  <Icone>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icone>
);

export const IconeSetaCima = () => (
  <Icone tamanho={18}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Icone>
);

export const IconeSetaBaixo = () => (
  <Icone tamanho={18}>
    <path d="M12 5v14M5 12l7 7 7-7" />
  </Icone>
);
