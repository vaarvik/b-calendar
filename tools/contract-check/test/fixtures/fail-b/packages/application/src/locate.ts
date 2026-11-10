import * as Location from 'expo-location';
import { View } from 'react-native';
import { thing } from '../../../apps/api/src/thing.js';
import type { Root } from '@b-calendar/api';
import { other } from '../../domain/src/calculator.js';

export type Remote = import('@expo/config').ExpoConfig;
export const values = [Location, View, thing, other] as const;
export type R = Root;
