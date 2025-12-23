import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import type { Customer } from '../../../preload';

export type ClientesContextValue = {
  clientes: Customer[];
  cargando: boolean;
  error: string;
  cargarClientes: () => Promise<Customer[]>;
  limpiarError: () => void;
};

const ClientesContext = createContext<ClientesContextValue | null>(null);

export function ClientesProvider({ children }: PropsWithChildren) {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await window.hedelmia.listarClientes();
      setClientes(data);
      return data;
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los clientes.');
      throw err;
    } finally {
      setCargando(false);
    }
  }, []);

  const limpiarError = useCallback(() => setError(''), []);

  const value = useMemo(
    () => ({ clientes, cargando, error, cargarClientes, limpiarError }),
    [clientes, cargando, error, cargarClientes, limpiarError]
  );

  return <ClientesContext.Provider value={value}>{children}</ClientesContext.Provider>;
}

export function useClientesContext() {
  const ctx = useContext(ClientesContext);
  if (!ctx) throw new Error('useClientesContext debe usarse dentro de ClientesProvider');
  return ctx;
}
