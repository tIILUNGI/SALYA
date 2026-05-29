import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_TITLE_SUFFIX, getPageTitle } from '../config/pageTitles';

/** Actualiza document.title quando a rota muda */
export default function PageTitleSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = getPageTitle(pathname);
    document.title = page === APP_TITLE_SUFFIX ? APP_TITLE_SUFFIX : `${page} | ${APP_TITLE_SUFFIX}`;
  }, [pathname]);

  return null;
}
