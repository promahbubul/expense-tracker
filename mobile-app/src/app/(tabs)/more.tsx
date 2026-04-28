import { MoreScreen } from '../../screens/MoreScreen';
import { useAuth } from '../../providers/AuthProvider';

export default function MoreRoute() {
  const { logout } = useAuth();

  return <MoreScreen onLogout={() => logout().catch(console.error)} />;
}
