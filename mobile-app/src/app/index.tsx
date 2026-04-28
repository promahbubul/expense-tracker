import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';

export default function IndexRoute() {
  const { user } = useAuth();
  return <Redirect href={user ? '/(tabs)' : '/sign-in'} />;
}
