import { Redirect } from 'expo-router';

export default function AppStart() {
  return <Redirect href={'/welcome' as never} />;
}
