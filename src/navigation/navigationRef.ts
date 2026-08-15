import { createNavigationContainerRef } from "@react-navigation/native";

/**
 * Lets code outside the React tree drive navigation.
 *
 * Needed because a notification tap arrives from a native event handler, not
 * from a component - there is no `useNavigation` to call at that point, and
 * on a cold start the tap is read before any screen has mounted.
 */
export const navigationRef = createNavigationContainerRef<any>();

export const navigateWhenReady = (name: string, params?: object) => {
  if (!navigationRef.isReady()) return false;
  // Cast through any: the ref is typed against a param list this helper is
  // deliberately generic over, and navigate()'s overloads reject the
  // (string, object) pair without a concrete route map.
  (navigationRef.navigate as any)(name, params);
  return true;
};
