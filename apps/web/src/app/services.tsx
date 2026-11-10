import { createContext, useContext } from 'react';
import type { Services } from '../composition-root';

export const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (services === null) {
    throw new Error('useServices outside ServicesContext');
  }
  return services;
}
