import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CompositionRoot } from '../composition-root';
import '../ui/styles.css';
import { AdminScreen } from './admin-screen';
import { CalendarScreen } from './calendar-screen';
import { ServicesContext } from './services';

function Router() {
  const path = location.pathname;
  const calendar = /^\/c\/([^/]+)\/?$/.exec(path);
  if (calendar?.[1] !== undefined) {
    return <CalendarScreen slug={decodeURIComponent(calendar[1])} />;
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <AdminScreen />;
  }
  return (
    <main className="empty-state">
      <p className="empty-state__mark">🎁</p>
      <p>Bruk lenken du fikk.</p>
    </main>
  );
}

const root = document.getElementById('root');
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <ServicesContext value={new CompositionRoot()}>
        <Router />
      </ServicesContext>
    </StrictMode>,
  );
}
