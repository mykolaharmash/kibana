/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useKibana } from './use_kibana';

type OnboardingProgress = Record<
  string,
  { status: string; message?: string }
> | null;

export function useOnboardingProgress(onboardingId: string | undefined) {
  const {
    services: { http },
  } = useKibana();
  const [onboardingProgress, setOnboardingProgress] =
    useState<OnboardingProgress | null>(null);

  const fetchOnboardingProgress = useCallback(async () => {
    if (!onboardingId) {
      return;
    }

    const response = await http.get<OnboardingProgress>(
      `/internal/observability_onboarding/flow/${onboardingId}/progress`
    );

    setOnboardingProgress(response);
  }, [http, onboardingId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOnboardingProgress();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchOnboardingProgress]);

  return onboardingProgress;
}
