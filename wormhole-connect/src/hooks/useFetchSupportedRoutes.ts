import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from 'store';
import config from 'config';
import { getTokenDetails } from 'telemetry';
import { maybeLogSdkError } from 'utils/errors';

type HookReturn = {
  supportedRoutes: string[];
  isFetching: boolean;
};

const useFetchSupportedRoutes = (): HookReturn => {
  const [routes, setRoutes] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const { token, destToken, fromChain, toChain, amount } = useSelector(
    (state: RootState) => state.transferInput,
  );

  const { toNativeToken } = useSelector((state: RootState) => state.relay);

  useEffect(() => {
    if (!fromChain || !toChain || !token || !destToken) {
      setRoutes([]);
      setIsFetching(false);
      return;
    }

    let isActive = true;

    const getSupportedRoutes = async () => {
      setIsFetching(true);
      const _routes: string[] = [];
      await config.routes.forEach(async (name, route) => {
        let supported = false;

        try {
          supported = await route.isRouteSupported(
            token,
            destToken,
            fromChain,
            toChain,
          );
          if (supported && config.isRouteSupportedHandler) {
            supported = await config.isRouteSupportedHandler({
              route: name,
              fromChain,
              toChain,
              fromToken: getTokenDetails(token),
              toToken: getTokenDetails(destToken),
            });
          }
        } catch (e) {
          maybeLogSdkError(
            e,
            `Error when checking route (${name}) is supported`,
          );
        }

        if (supported) {
          _routes.push(name);
        }
      });

      if (isActive) {
        setIsFetching(false);
        setRoutes(_routes);
      }
    };

    getSupportedRoutes();

    return () => {
      isActive = false;
    };
  }, [token, destToken, amount, fromChain, toChain, toNativeToken]);

  return {
    supportedRoutes: routes,
    isFetching,
  };
};

export default useFetchSupportedRoutes;
