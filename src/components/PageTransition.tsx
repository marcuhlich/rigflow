import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

const TRANSITION_CSS = `
  @keyframes pageSlideIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .page-enter {
    animation: pageSlideIn 0.4s ease forwards;
  }
`;

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <>
      <style>{TRANSITION_CSS}</style>
      <div key={location.pathname} className="page-enter">
        {children}
      </div>
    </>
  );
}

