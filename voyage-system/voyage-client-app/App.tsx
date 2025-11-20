import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// NOTE: For Android Emulator, use 'http://10.0.2.2:8000' and 'http://10.0.2.2:3001'
// For iOS Simulator or Web, 'http://localhost:8000' works.
const CLIENT_BACKEND_URL = 'http://localhost:8000'; 
const VOYAGE_APP_URL = 'http://localhost:3001';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'voyage'>('dashboard');
  const [voyageUrl, setVoyageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const launchVoyage = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${CLIENT_BACKEND_URL}/launch-voyage-token`);
      const data = await response.json();
      if (data.token) {
        // Construct URL with encrypted data
        const url = `${VOYAGE_APP_URL}?data=${data.token}`;
        setVoyageUrl(url);
        setView('voyage');
      } else {
        alert('Failed to get token');
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'voyage' && voyageUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('dashboard')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Bank</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voyage Travel</Text>
        </View>
        {Platform.OS === 'web' ? (
          <iframe 
            src={voyageUrl} 
            style={{ flex: 1, border: 'none', height: '100%' }} 
            title="Voyage App"
          />
        ) : (
          <WebView 
            source={{ uri: voyageUrl }} 
            style={{ flex: 1 }}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.dashboardHeader}>
          <Text style={styles.greeting}>Good Morning, Jaison</Text>
          <Text style={styles.balance}>$12,450.00</Text>
          <Text style={styles.balanceLabel}>Available Balance</Text>
        </View>

        <Text style={styles.sectionTitle}>My Apps</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
          <TouchableOpacity style={styles.tile} onPress={launchVoyage}>
            <View style={[styles.icon, { backgroundColor: '#4F46E5' }]} />
            <Text style={styles.tileText}>Voyage</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.tile}>
            <View style={[styles.icon, { backgroundColor: '#10B981' }]} />
            <Text style={styles.tileText}>Invest</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.tile}>
            <View style={[styles.icon, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.tileText}>Loans</Text>
          </TouchableOpacity>
        </ScrollView>

        {loading && <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 20,
  },
  dashboardHeader: {
    backgroundColor: '#1F2937',
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  greeting: {
    color: '#9CA3AF',
    fontSize: 16,
    marginBottom: 8,
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  balanceLabel: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  carousel: {
    flexDirection: 'row',
  },
  tile: {
    backgroundColor: '#FFFFFF',
    width: 120,
    height: 120,
    borderRadius: 16,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
  },
  tileText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F2937',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
});
