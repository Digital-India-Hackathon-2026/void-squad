import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { scanAPI } from '../lib/api';
import { C } from '../lib/colors';

export default function ScanScreen() {
  const [frontImage, setFrontImage] = useState<{ uri: string; base64: string } | null>(null);
  const [backImage,  setBackImage]  = useState<{ uri: string; base64: string } | null>(null);
  const [scanning,   setScanning]   = useState(false);
  const router = useRouter();

  async function pickImage(type: 'front' | 'back', source: 'camera' | 'gallery') {
    const perms = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perms.granted) {
      Alert.alert('Permission required', `Please allow ${source} access in Settings.`);
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, mediaTypes: ['images'] })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ['images'] });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const img = { uri: asset.uri, base64: asset.base64 || '' };
      if (type === 'front') setFrontImage(img);
      else setBackImage(img);
    }
  }

  function showPickOptions(type: 'front' | 'back') {
    Alert.alert(
      type === 'back' ? 'Ingredients Label (Back)' : 'Front of Pack (Optional)',
      'Choose source',
      [
        { text: '📷 Camera',  onPress: () => pickImage(type, 'camera') },
        { text: '🖼️ Gallery', onPress: () => pickImage(type, 'gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function handleScan() {
    if (!backImage) { Alert.alert('Required', 'Please capture the ingredients label (back of pack).'); return; }
    setScanning(true);
    try {
      const res = await scanAPI.analyze({
        backImageBase64:  `data:image/jpeg;base64,${backImage.base64}`,
        frontImageBase64: frontImage ? `data:image/jpeg;base64,${frontImage.base64}` : undefined,
      });
      if (res.data?.success && res.data?.scanId) {
        router.push(`/results/${res.data.scanId}`);
      } else {
        Alert.alert('Scan Failed', res.data?.message || 'Could not analyse the image. Try a clearer photo.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scan Product</Text>
      <Text style={styles.subtitle}>Capture the ingredients label to get a personalized health analysis.</Text>

      {/* Back image — required */}
      <ImageSlot
        label="Ingredients Label"
        sublabel="Back of pack — REQUIRED"
        image={backImage}
        required
        onPress={() => showPickOptions('back')}
        onClear={() => setBackImage(null)}
      />

      {/* Front image — optional */}
      <ImageSlot
        label="Front of Pack"
        sublabel="Optional — for claim checking"
        image={frontImage}
        required={false}
        onPress={() => showPickOptions('front')}
        onClear={() => setFrontImage(null)}
      />

      <TouchableOpacity
        style={[styles.scanBtn, (!backImage || scanning) && styles.scanBtnDisabled]}
        onPress={handleScan}
        disabled={!backImage || scanning}
      >
        {scanning ? (
          <View style={styles.scanningRow}>
            <ActivityIndicator color="#000" />
            <Text style={styles.scanBtnText}>Analysing with AI...</Text>
          </View>
        ) : (
          <Text style={styles.scanBtnText}>🔬 Analyse Product</Text>
        )}
      </TouchableOpacity>
      {scanning && (
        <Text style={styles.scanHint}>This can take 15-30 seconds — Gemini is reading the label.</Text>
      )}
    </ScrollView>
  );
}

function ImageSlot({ label, sublabel, image, required, onPress, onClear }: any) {
  return (
    <View style={slots.wrap}>
      <View style={slots.header}>
        <View>
          <Text style={slots.label}>{label}</Text>
          <Text style={[slots.sublabel, required && { color: C.error }]}>{sublabel}</Text>
        </View>
        {image && (
          <TouchableOpacity onPress={onClear} style={slots.clearBtn}>
            <Text style={slots.clearText}>✕ Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={[slots.slot, image && slots.slotFilled]} onPress={onPress}>
        {image ? (
          <Image source={{ uri: image.uri }} style={slots.preview} resizeMode="cover" />
        ) : (
          <View style={slots.placeholder}>
            <Text style={slots.placeholderIcon}>{required ? '📋' : '📦'}</Text>
            <Text style={slots.placeholderText}>Tap to capture</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 20 },
  scanBtn: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  scanBtnDisabled: { opacity: 0.4 },
  scanBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  scanningRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  scanHint: { textAlign: 'center', color: C.muted, fontSize: 13 },
});

const slots = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: 15, fontWeight: '600', color: C.text },
  sublabel: { fontSize: 12, color: C.muted, marginTop: 2 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: C.surface2 },
  clearText: { fontSize: 12, color: C.error },
  slot: { height: 180, borderRadius: 16, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', overflow: 'hidden', backgroundColor: C.surface },
  slotFilled: { borderStyle: 'solid', borderColor: C.primary + '55' },
  preview: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderIcon: { fontSize: 36 },
  placeholderText: { color: C.muted, fontSize: 14 },
});
