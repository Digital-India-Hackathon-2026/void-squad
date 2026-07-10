import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { scanAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { C, RISK, normalizeBand } from '../lib/colors';
import Svg, { Circle } from 'react-native-svg';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [history, setHistory]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    if (!user?._id) return;
    try {
      const res = await scanAPI.history(user._id);
      if (res.data?.success) setHistory(res.data.scans);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }

  const highRisk = history.filter(s => normalizeBand(s.riskBand) === 'High').length;
  const avgScore = history.length
    ? Math.round(history.reduce((a, s) => a + (s.riskScore ?? 0), 0) / history.length)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor={C.primary} />}
    >
      {/* Greeting */}
      <View style={styles.greetWrap}>
        <View>
          <Text style={styles.greetSub}>Good {getTimeOfDay()},</Text>
          <Text style={styles.greetName}>{user?.name?.split(' ')[0] || 'there'} 👋</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Scans" value={history.length} icon="🔬" />
        <StatCard label="Avg Risk" value={`${avgScore}`} icon="📊" sub="/100" />
        <StatCard label="High Risk" value={highRisk} icon="⚠️" color={highRisk > 0 ? C.error : undefined} />
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.scanCTA} onPress={() => router.push('/(tabs)/scan')}>
        <Text style={styles.scanCTAText}>🔬 Scan a Product</Text>
      </TouchableOpacity>

      {/* History */}
      <Text style={styles.sectionTitle}>Recent Scans</Text>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
      ) : history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySub}>Scan a product label to get your personalized health analysis.</Text>
        </View>
      ) : (
        history.map((scan) => (
          <ScanHistoryCard key={scan.scanId} scan={scan} onPress={() => router.push(`/results/${scan.scanId}`)} />
        ))
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, icon, sub, color }: any) {
  return (
    <View style={stat.card}>
      <Text style={stat.icon}>{icon}</Text>
      <Text style={[stat.value, color && { color }]}>{value}<Text style={stat.sub}>{sub}</Text></Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

function ScanHistoryCard({ scan, onPress }: any) {
  const band = normalizeBand(scan.riskBand);
  const cfg  = RISK[band];
  const r = 14, circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(scan.riskScore ?? 0, 100) / 100) * circumference;

  return (
    <TouchableOpacity style={hc.card} onPress={onPress} activeOpacity={0.7}>
      <View style={hc.ringWrap}>
        <Svg width={40} height={40} viewBox="0 0 40 40" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={20} cy={20} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={4} fill="none" />
          <Circle cx={20} cy={20} r={r} stroke={cfg.stroke} strokeWidth={4} fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </Svg>
        <Text style={[hc.ringScore, { color: cfg.color }]}>{scan.riskScore ?? '?'}</Text>
      </View>
      <View style={hc.info}>
        <Text style={hc.name} numberOfLines={1}>{scan.productName}</Text>
        {scan.brand && <Text style={hc.brand}>{scan.brand}</Text>}
        <View style={[hc.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[hc.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={hc.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 56, gap: 20, paddingBottom: 40 },
  greetWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greetSub: { color: C.muted, fontSize: 13 },
  greetName: { color: C.text, fontSize: 26, fontWeight: '800' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  logoutText: { color: C.muted, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10 },
  scanCTA: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  scanCTAText: { color: '#000', fontWeight: '700', fontSize: 15 },
  sectionTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  emptyCard: { backgroundColor: C.surface, borderRadius: 20, padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

const stat = StyleSheet.create({
  card: { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 14, gap: 2, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  icon: { fontSize: 20 },
  value: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, fontWeight: '400', color: C.muted },
  label: { fontSize: 11, color: C.muted },
});

const hc = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, padding: 14, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border },
  ringWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  ringScore: { position: 'absolute', fontSize: 10, fontWeight: '700' },
  info: { flex: 1, gap: 4 },
  name: { color: C.text, fontSize: 14, fontWeight: '600' },
  brand: { color: C.muted, fontSize: 12 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  chevron: { color: C.muted, fontSize: 20 },
});
