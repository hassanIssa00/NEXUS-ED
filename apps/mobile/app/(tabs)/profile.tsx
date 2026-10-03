import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const roleLabels: Record<string, string> = {
  STUDENT: 'طالب',
  PARENT: 'ولي أمر',
  TEACHER: 'معلم',
  ADMIN: 'إدارة المدرسة',
  PRINCIPAL: 'مدير المدرسة',
  VICE_PRINCIPAL: 'وكيل المدرسة',
  COUNSELOR: 'مرشد طلابي',
  SUPERVISOR: 'مشرف',
  ACCOUNTANT: 'محاسب',
  HR: 'موارد بشرية',
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={34} color="#FFFFFF" />
        </View>
        <Text style={styles.name}>{user?.name || user?.email || 'Nexus EDU'}</Text>
        <Text style={styles.role}>{user?.role ? roleLabels[user.role] ?? user.role : ''}</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.sectionTitle}>بيانات الحساب</Text>
        <View style={styles.detailRow}>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
          <Text style={styles.label}>البريد الإلكتروني</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.value}>{user?.role ? roleLabels[user.role] ?? user.role : '—'}</Text>
          <Text style={styles.label}>نوع الحساب</Text>
        </View>
      </View>

      <TouchableOpacity accessibilityRole="button" style={styles.logout} onPress={() => void signOut()}>
        <Ionicons name="log-out-outline" size={20} color="#B42318" />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 56, backgroundColor: '#F5F7FA' },
  profile: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#FFFFFF', borderRadius: 6 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#365CF5', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  name: { color: '#182230', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  role: { color: '#52627A', fontSize: 14, marginTop: 5 },
  details: { marginTop: 24 },
  sectionTitle: { color: '#182230', fontSize: 16, fontWeight: '700', marginBottom: 10, textAlign: 'right' },
  detailRow: { padding: 14, marginBottom: 1, backgroundColor: '#FFFFFF' },
  label: { color: '#52627A', fontSize: 12, marginTop: 4, textAlign: 'right' },
  value: { color: '#182230', fontSize: 14, textAlign: 'right' },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, marginTop: 28, borderRadius: 6, borderWidth: 1, borderColor: '#F0B4B0', backgroundColor: '#FFFFFF' },
  logoutText: { color: '#B42318', fontSize: 14, fontWeight: '600' },
});
