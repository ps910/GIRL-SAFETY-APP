import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import Logger from '../../utils/logger';
import { requestLocationPermission } from '../../utils/helpers';
import type { LocationData } from '../../types';

export const STORAGE_KEYS = {
  JOURNEY: '@girl_safety_journey',
  JOURNEY_BREADCRUMBS: '@girl_safety_journey_breadcrumbs',
  JOURNEY_HISTORY: '@girl_safety_journey_history',
} as const;

export interface Breadcrumb {
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  altitude: number;
  timestamp: string;
  moving: boolean;
  distFromPrev: number;
  /** True if this point is part of a detected stop */
  isStop?: boolean;
  /** Duration of the stop in ms (set on the last breadcrumb of a stop) */
  stopDuration?: number;
  /** Reverse-geocoded address of the stop (populated asynchronously) */
  stopAddress?: string;
}

export interface JourneyStats {
  distance: number;
  avgSpeed: number;
  maxSpeed: number;
}

export interface ActiveJourney {
  active: boolean;
  destination: string;
  startTime: string;
  startLocation: LocationData | null;
  expectedArrival: string;
  minutesToArrive: number;
}

export interface CompletedJourney extends ActiveJourney {
  completedAt: string;
  endLocation: LocationData | null;
  breadcrumbs: Breadcrumb[];
  stats: JourneyStats;
  status: 'overdue' | 'completed';
}

export interface JourneyShareData {
  destination: string;
  startTime: string;
  expectedArrival: string;
  startLocation: LocationData | null;
  currentLocation: LocationData | null;
  breadcrumbs: Breadcrumb[];
  stats: JourneyStats;
  isOverdue: boolean;
  totalPoints: number;
}

export function useJourneyStore(
  currentLocation: LocationData | null,
  setCurrentLocation: (loc: LocationData | null) => void
) {
  const [activeJourney, setActiveJourney] = useState<ActiveJourney | null>(null);
  const [journeyOverdue, setJourneyOverdue] = useState<boolean>(false);
  const [journeyBreadcrumbs, setJourneyBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [isDeviceMoving, setIsDeviceMoving] = useState<boolean>(false);
  const [journeyStats, setJourneyStats] = useState<JourneyStats>({ distance: 0, avgSpeed: 0, maxSpeed: 0 });
  const [journeyHistory, setJourneyHistory] = useState<CompletedJourney[]>([]);

  const journeyLocationRef = useRef<Location.LocationSubscription | null>(null);
  const journeyBreadcrumbsRef = useRef<Breadcrumb[]>([]);
  const lastBreadcrumbRef = useRef<Breadcrumb | null>(null);

  const loadJourneyData = useCallback(async () => {
    try {
      const journeyData = await AsyncStorage.getItem(STORAGE_KEYS.JOURNEY);
      const breadcrumbData = await AsyncStorage.getItem(STORAGE_KEYS.JOURNEY_BREADCRUMBS);
      const histData = await AsyncStorage.getItem(STORAGE_KEYS.JOURNEY_HISTORY);

      if (journeyData) {
        const j = JSON.parse(journeyData) as ActiveJourney;
        if (j && j.active) setActiveJourney(j);
      }
      if (breadcrumbData) {
        const crumbs: Breadcrumb[] = JSON.parse(breadcrumbData);
        setJourneyBreadcrumbs(crumbs);
        journeyBreadcrumbsRef.current = crumbs;
      }
      if (histData) {
        setJourneyHistory(JSON.parse(histData));
      }
    } catch (error) {
      Logger.error('[JourneyStore] Error loading journey data:', error);
    }
  }, []);

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const startBreadcrumbTracking = async (): Promise<void> => {
    try {
      const hasPerm = await requestLocationPermission();
      if (!hasPerm) return;

      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 3 },
        (loc) => {
          const { latitude, longitude, speed, accuracy, altitude } = loc.coords;
          const ts = new Date().toISOString();
          const prev = lastBreadcrumbRef.current;

          let moved = false;
          let dist = 0;
          if (prev) {
            dist = haversineDistance(prev.latitude, prev.longitude, latitude, longitude);
            moved = dist > 3;
          } else {
            moved = true;
          }

          setIsDeviceMoving(moved);

          const crumb: Breadcrumb = {
            latitude,
            longitude,
            speed: speed || 0,
            accuracy: accuracy || 0,
            altitude: altitude || 0,
            timestamp: ts,
            moving: moved,
            distFromPrev: dist,
            isStop: false,
          };

          // Stop detection: speed < 0.5 m/s = stationary
          const isStationary = (speed || 0) < 0.5;
          const prevCrumbs = journeyBreadcrumbsRef.current;
          if (isStationary && prevCrumbs.length > 0) {
            const lastMovingIdx = [...prevCrumbs].reverse().findIndex(c => (c.speed || 0) >= 0.5);
            if (lastMovingIdx >= 1) {
              // We've been stationary for multiple points
              const stopStartCrumb = prevCrumbs[prevCrumbs.length - lastMovingIdx];
              if (stopStartCrumb) {
                const stopDurationMs = new Date(ts).getTime() - new Date(stopStartCrumb.timestamp).getTime();
                if (stopDurationMs > 60000) {
                  crumb.isStop = true;
                  crumb.stopDuration = stopDurationMs;
                }
              }
            }
          }

          lastBreadcrumbRef.current = crumb;
          journeyBreadcrumbsRef.current = [...journeyBreadcrumbsRef.current, crumb];
          setJourneyBreadcrumbs([...journeyBreadcrumbsRef.current]);

          const crumbs = journeyBreadcrumbsRef.current;
          let totalDist = 0;
          let maxSpd = 0;
          let spdSum = 0;
          let spdCount = 0;
          for (let i = 1; i < crumbs.length; i++) {
            totalDist += crumbs[i].distFromPrev || 0;
            if (crumbs[i].speed > 0) {
              spdSum += crumbs[i].speed;
              spdCount++;
              if (crumbs[i].speed > maxSpd) maxSpd = crumbs[i].speed;
            }
          }
          setJourneyStats({
            distance: totalDist,
            avgSpeed: spdCount > 0 ? spdSum / spdCount : 0,
            maxSpeed: maxSpd,
          });

          if (crumbs.length % 10 === 0) {
            AsyncStorage.setItem(STORAGE_KEYS.JOURNEY_BREADCRUMBS, JSON.stringify(crumbs)).catch(() => {});
          }

          setCurrentLocation(loc as unknown as LocationData);
        }
      );
      journeyLocationRef.current = sub;
      Logger.log('[JourneyStore] Breadcrumb tracking started');
    } catch (e) {
      Logger.error('[JourneyStore] Breadcrumb tracking failed:', e);
    }
  };

  const stopBreadcrumbTracking = useCallback((): void => {
    if (journeyLocationRef.current) {
      journeyLocationRef.current.remove();
      journeyLocationRef.current = null;
      Logger.log('[JourneyStore] Breadcrumb tracking stopped');
    }
    setIsDeviceMoving(false);
    lastBreadcrumbRef.current = null;
  }, []);

  const startJourney = async (destination: string, minutesToArrive: number): Promise<ActiveJourney> => {
    const journey: ActiveJourney = {
      active: true,
      destination,
      startTime: new Date().toISOString(),
      startLocation: currentLocation,
      expectedArrival: new Date(Date.now() + minutesToArrive * 60000).toISOString(),
      minutesToArrive,
    };
    setActiveJourney(journey);
    setJourneyOverdue(false);

    journeyBreadcrumbsRef.current = [];
    setJourneyBreadcrumbs([]);
    setJourneyStats({ distance: 0, avgSpeed: 0, maxSpeed: 0 });
    await AsyncStorage.setItem(STORAGE_KEYS.JOURNEY_BREADCRUMBS, '[]').catch(() => {});

    await startBreadcrumbTracking();
    await AsyncStorage.setItem(STORAGE_KEYS.JOURNEY, JSON.stringify(journey)).catch(() => {});
    return journey;
  };

  const completeJourney = useCallback(async (): Promise<void> => {
    stopBreadcrumbTracking();

    if (activeJourney) {
      const completedJourney: CompletedJourney = {
        ...activeJourney,
        active: false,
        completedAt: new Date().toISOString(),
        endLocation: currentLocation,
        breadcrumbs: journeyBreadcrumbsRef.current,
        stats: journeyStats,
        status: journeyOverdue ? 'overdue' : 'completed',
      };
      setJourneyHistory((prev) => {
        const updated = [completedJourney, ...prev].slice(0, 20);
        AsyncStorage.setItem(STORAGE_KEYS.JOURNEY_HISTORY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    }

    setActiveJourney(null);
    setJourneyOverdue(false);
    journeyBreadcrumbsRef.current = [];
    setJourneyBreadcrumbs([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.JOURNEY).catch(() => {});
    await AsyncStorage.removeItem(STORAGE_KEYS.JOURNEY_BREADCRUMBS).catch(() => {});
  }, [activeJourney, journeyOverdue, journeyStats, currentLocation, stopBreadcrumbTracking]);

  const extendJourney = async (extraMinutes: number): Promise<void> => {
    if (!activeJourney) return;
    const newEta = new Date(new Date(activeJourney.expectedArrival).getTime() + extraMinutes * 60000).toISOString();
    const updated: ActiveJourney = {
      ...activeJourney,
      expectedArrival: newEta,
      minutesToArrive: activeJourney.minutesToArrive + extraMinutes,
    };
    setActiveJourney(updated);
    setJourneyOverdue(false);
    await AsyncStorage.setItem(STORAGE_KEYS.JOURNEY, JSON.stringify(updated)).catch(() => {});
    Logger.log(`[JourneyStore] Extended journey by ${extraMinutes}m, new ETA: ${newEta}`);
  };

  const getJourneyShareData = useCallback((): JourneyShareData | null => {
    if (!activeJourney) return null;
    return {
      destination: activeJourney.destination,
      startTime: activeJourney.startTime,
      expectedArrival: activeJourney.expectedArrival,
      startLocation: activeJourney.startLocation,
      currentLocation,
      breadcrumbs: journeyBreadcrumbs,
      stats: journeyStats,
      isOverdue: journeyOverdue,
      totalPoints: journeyBreadcrumbs.length,
    };
  }, [activeJourney, currentLocation, journeyBreadcrumbs, journeyStats, journeyOverdue]);

  return {
    activeJourney,
    journeyOverdue,
    setJourneyOverdue,
    journeyBreadcrumbs,
    isDeviceMoving,
    journeyStats,
    journeyHistory,
    loadJourneyData,
    startJourney,
    completeJourney,
    extendJourney,
    getJourneyShareData,
    stopBreadcrumbTracking,
  };
}
