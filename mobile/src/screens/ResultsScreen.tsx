import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { scanAPI, translateAPI } from '../lib/api';
import { C, RISK, normalizeBand } from '../lib/colors';
import Svg, { Circle } from 'react-native-svg';

const LANGUAGES = [
  { code: 'en', label: 'EN' }, { code: 'hi', label: 'HI' },
  { code: 'te', label: 'TE' }, { code: 'ta', label: 'TA' },
  { code: 'bn', label: 'BN' }, { code: 'mr', label: 'MR' },
  { code: 'gu', label: 'GU' }, { code: 'kn', label: 'KN' },
  { code: 'ml', label: 'ML' }, { code: 'pa', label: 'PA' },
];

export default function ResultsScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const router = useRouter();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [lang, setLang]         = useState('en');
  const [tData, setTData]       = useState<any>(null);
  const [translating, setTrans] = useState(false);

  useEffect(() => { fetchScan(); }, []);

  async function fetchScan() {
    setLoading(true);
    try {
      const res = await scanAPI.getById(scanId);
      if (res.data?.success) setData(res.data);
      else setError(res.data?.message || 'Analysis failed.');
    } catch { setError('Failed to load results.'); }
    finally { setLoading(false); }
  }

  async function handleLang(code: string) {
    setLang(code);
    if (code === 'en') { setTData(null); return; }
    setTrans(true);
    try {
      const res = await translateAPI.translateScan({ scanId, targetLanguage: code, includeProceedAnyway: false });
      if (res.data?.success) setTData(res.data);
    } catch {}
    finally { setTrans(false); }
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error} onRetry={fetchScan} onBack={() => router.back()} />;

  const band = normalizeBand(data.risk_band);
  const cfg  = RISK[band];
  const tf   = tData?.translatedFields || {};
  const verdict   = { ...data.personalized_verdict, ...tf.personalized_verdict };
  const claims    = (data.claim_compliance ?? []).map((c: any, i: number) => ({ ...c, ...tf.claim_compliance?.[i] }));
  const quid      = (data.quid_analysis    ?? []).map((q: any, i: number) => ({ ...q, ...tf.quid_analysis?.[i] }));
  const insights  = (data.key_risk_insights ?? []).map((ins: any, i: number) => ({ ...ins, ...tf.key_risk_insights?.[i] }));
  const nutrition = data.product?.nutrition_per_serving ?? {};

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DeCode.it</Text>
        <View style={styles.langRow}>
          {translating && <ActivityIndicator size="small" color={C.muted} />}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 160 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {LANGUAGES.map(l => (
                <TouchableOpacity key={l.code} onPress={() => handleLang(l.code)}
                  style={[styles.langBtn, lang === l.code && styles.langBtnActive]}>
                  <Text style={[styles.langText, lang === l.code && styles.langTextActive]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Risk Ring Hero */}
        <View style={[styles.heroCard, { borderColor: cfg.stroke + '44' }]}>
          <RiskRing score={data.risk_score} band={band} />
          <View style={styles.heroInfo}>
            <View style={[styles.riskBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.riskBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.productName}>{data.product?.product_name || 'Product'}</Text>
            {data.product?.brand && <Text style={styles.brandName}>{data.product.brand}</Text>}
            {data.product?.allergens?.length > 0 && (
              <View style={styles.allergenWrap}>
                {data.product.allergens.map((a: string, i: number) => (
                  <View key={i} style={styles.allergenTag}>
                    <Text style={styles.allergenText}>⚠️ {a}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* AI Verdict */}
        <Section title="AI Verdict" icon="🧠">
          <Text style={styles.verdictText}>{verdict?.summary || 'Analysis complete.'}</Text>
        </Section>

        {/* Key Risk Insights */}
        {insights.length > 0 && (
          <Section title="Key Risk Insights" icon="🔥">
            {insights.map((ins: any, i: number) => (
              <View key={i} style={styles.insightCard}>
                <Text style={[styles.insightDot, { color: ins.impact === 'High' ? C.error : ins.impact === 'Moderate' ? C.secondary : C.primary }]}>●</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightText}>{ins.statement}</Text>
                  {ins.condition && <Text style={styles.insightCond}>Related: {ins.condition}</Text>}
                </View>
              </View>
            ))}
          </Section>
        )}

        {/* Nutrient Impact */}
        {verdict && (
          <Section title="Daily Limit Impact" icon="📊">
            {[
              { label: 'Sugar',          pct: verdict.sugar_pct_daily_limit,   val: nutrition.sugar,         unit: 'g'   },
              { label: 'Sodium',         pct: verdict.sodium_pct_daily_limit,  val: nutrition.sodium,        unit: 'mg'  },
              { label: 'Saturated Fat',  pct: verdict.sat_fat_pct_daily_limit, val: nutrition.saturated_fat, unit: 'g'   },
            ].filter(n => n.pct != null).map(n => (
              <NutrientBar key={n.label} label={n.label} pct={n.pct} val={n.val} unit={n.unit} />
            ))}
          </Section>
        )}

        {/* Claim Compliance */}
        {claims.length > 0 && (
          <Section title="Claim Compliance" icon="⚖️">
            {claims.map((c: any, i: number) => (
              <ClaimCard key={i} claim={c} />
            ))}
          </Section>
        )}

        {/* Reality vs Marketing */}
        <Section title="Reality vs Marketing" icon="🔍">
          {quid.length > 0 ? quid.map((q: any, i: number) => (
            <View key={i} style={styles.quidCard}>
              <View style={[styles.quidRank, { backgroundColor: i === 0 ? C.error + '22' : i === 1 ? C.secondary + '22' : C.surface2 }]}>
                <Text style={[styles.quidRankText, { color: i === 0 ? C.error : i === 1 ? C.secondary : C.muted }]}>#{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quidIngredient}>{q.ingredient}</Text>
                <Text style={styles.quidStatement}>{q.statement}</Text>
              </View>
            </View>
          )) : (
            <Text style={styles.emptyText}>No ingredient ordering data — try a clearer photo of the label.</Text>
          )}
        </Section>

        {/* Better Choices */}
        {data.alternatives?.length > 0 && (
          <Section title="Better Choices For You" icon="✅">
            {data.alternatives.map((alt: any, i: number) => (
              <View key={i} style={styles.altCard}>
                <Text style={styles.altName}>{alt.name}</Text>
                {alt.reason && <Text style={styles.altReason}>{alt.reason}</Text>}
              </View>
            ))}
          </Section>
        )}

        <TouchableOpacity style={styles.scanAgainBtn} onPress={() => router.replace('/(tabs)/scan')}>
          <Text style={styles.scanAgainText}>🔬 Scan Another Product</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function RiskRing({ score, band }: { score: number; band: string }) {
  const cfg = RISK[band] || RISK.Low;
  const r = 44, size = 110, stroke = 10;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(score ?? 0, 100) / 100) * circumference;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={cfg.stroke} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={[styles.ringScore, { color: cfg.color }]}>{score ?? '—'}</Text>
        <Text style={styles.ringLabel}>/100</Text>
      </View>
    </View>
  );
}

function NutrientBar({ label, pct, val, unit }: any) {
  const capped = Math.min(pct ?? 0, 100);
  const color = pct >= 90 ? C.error : pct >= 60 ? C.secondary : C.primary;
  return (
    <View style={nb.wrap}>
      <View style={nb.row}>
        <Text style={nb.label}>{label}</Text>
        <Text style={[nb.pct, { color }]}>{Math.round(pct)}% of RDA</Text>
      </View>
      <View style={nb.track}>
        <View style={[nb.fill, { width: `${capped}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ClaimCard({ claim }: any) {
  const isGood = claim.status === 'compliant';
  const isRisk = claim.status?.includes('non-') || claim.status === 'high-risk-category';
  const color  = isGood ? C.primary : isRisk ? C.error : C.secondary;
  return (
    <View style={[cc.wrap, { borderColor: color + '44', backgroundColor: color + '11' }]}>
      <Text style={[cc.status, { color }]}>{claim.status?.replace(/-/g, ' ').toUpperCase()}</Text>
      <Text style={cc.claim}>"{claim.claim_text}"</Text>
      {claim.reason && <Text style={cc.reason}>{claim.reason}</Text>}
    </View>
  );
}

function Section({ title, icon, children }: any) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{icon} {title}</Text>
      {children}
    </View>
  );
}

function LoadingState() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={{ color: C.muted }}>Analysing label...</Text>
    </View>
  );
}

function ErrorState({ message, onRetry, onBack }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 48 }}>😟</Text>
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>Analysis Failed</Text>
      <Text style={{ color: C.muted, textAlign: 'center' }}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={{ backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 }}>
        <Text style={{ color: '#000', fontWeight: '700' }}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack}><Text style={{ color: C.muted }}>Go Back</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 20, color: C.primary },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.primary, flex: 1 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  langBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  langText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  langTextActive: { color: '#000' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  heroCard: { backgroundColor: C.surface, borderRadius: 20, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'center', borderWidth: 1 },
  heroInfo: { flex: 1, gap: 6 },
  riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  riskBadgeText: { fontSize: 12, fontWeight: '700' },
  productName: { fontSize: 16, fontWeight: '700', color: C.text },
  brandName: { fontSize: 13, color: C.muted },
  allergenWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  allergenTag: { backgroundColor: C.error + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.error + '44' },
  allergenText: { fontSize: 11, color: C.error },
  ringScore: { fontSize: 26, fontWeight: '800' },
  ringLabel: { fontSize: 11, color: C.muted },
  verdictText: { color: C.muted, fontSize: 14, lineHeight: 22 },
  insightCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  insightDot: { fontSize: 10, paddingTop: 4 },
  insightText: { color: C.text, fontSize: 13, lineHeight: 20 },
  insightCond: { color: C.muted, fontSize: 11, marginTop: 2 },
  quidCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  quidRank: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  quidRankText: { fontSize: 11, fontWeight: '700' },
  quidIngredient: { color: C.text, fontSize: 13, fontWeight: '600' },
  quidStatement: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  emptyText: { color: C.muted, fontSize: 13 },
  altCard: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  altName: { color: C.text, fontSize: 13, fontWeight: '600' },
  altReason: { color: C.muted, fontSize: 12, marginTop: 2 },
  scanAgainBtn: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  scanAgainText: { color: '#000', fontWeight: '700', fontSize: 15 },
});

const nb = StyleSheet.create({
  wrap: { gap: 6, paddingVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: C.text, fontSize: 13, fontWeight: '600' },
  pct: { fontSize: 13 },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
});

const cc = StyleSheet.create({
  wrap: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 8, gap: 4 },
  status: { fontSize: 10, fontWeight: '700' },
  claim: { color: C.text, fontSize: 13, fontStyle: 'italic' },
  reason: { color: C.muted, fontSize: 12, lineHeight: 18 },
});

const sec = StyleSheet.create({
  wrap: { gap: 12 },
  title: { color: C.text, fontSize: 16, fontWeight: '700' },
});
