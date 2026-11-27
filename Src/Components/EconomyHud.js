import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  ErrorCode,
  finishTransaction,
  useIAP,
} from 'react-native-iap';
import { useIsFocused } from '@react-navigation/native';
import {
  claimDailyReward,
  confirmPlayPurchase,
  getEconomy,
  PLAY_STORE_PACKAGES,
  redeemEconomyItem,
} from '../services/economyService';

const NAV_ITEMS = [
  { id: 'skin', label: 'Skin', icon: 'palette' },
  { id: 'events', label: 'Events', icon: 'event' },
  { id: 'lobby', label: 'Lobby', icon: 'home' },
  { id: 'social', label: 'Social', icon: 'people' },
  { id: 'store', label: 'Store', icon: 'storefront' },
];

const EconomyHud = ({
  children,
  isAuthenticated,
  onOpenSettings,
  onProfilePress,
  username,
}) => {
  const isFocused = useIsFocused();
  const pulse = useRef(new Animated.Value(1)).current;
  const processingPurchaseTokens = useRef(new Set());
  const [activePage, setActivePage] = useState('lobby');
  const [economy, setEconomy] = useState(null);
  const [loadingEconomy, setLoadingEconomy] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState(null);
  const [shopVisible, setShopVisible] = useState(false);
  const [purchasingProduct, setPurchasingProduct] = useState(null);

  const refreshEconomy = useCallback(async () => {
    if (!isAuthenticated) {
      setEconomy(null);
      return null;
    }

    setLoadingEconomy(true);
    try {
      const currentEconomy = await getEconomy();
      setEconomy(currentEconomy);
      setError(null);
      return currentEconomy;
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your Gapes balance.');
      return null;
    } finally {
      setLoadingEconomy(false);
    }
  }, [isAuthenticated]);

  const processPurchase = useCallback(async purchase => {
    const purchaseToken = purchase.purchaseToken;
    if (
      !isAuthenticated ||
      purchase.store !== 'google' ||
      purchase.purchaseState !== 'purchased' ||
      !purchaseToken
    ) {
      throw new Error('This Google Play purchase could not be verified.');
    }
    if (processingPurchaseTokens.current.has(purchaseToken)) {
      return;
    }

    processingPurchaseTokens.current.add(purchaseToken);
    setPurchasingProduct(purchase.productId);
    try {
      await confirmPlayPurchase(purchase.productId, purchaseToken);
      setEconomy(await getEconomy());
      await finishTransaction({ purchase, isConsumable: true });
      setError(null);
    } finally {
      processingPurchaseTokens.current.delete(purchaseToken);
      setPurchasingProduct(null);
    }
  }, [isAuthenticated]);

  const handlePurchaseSuccess = useCallback(purchase => {
    processPurchase(purchase).catch(purchaseError => {
      setError(
        purchaseError.message ||
          'Purchase verification failed. Your purchase will remain pending.',
      );
    });
  }, [processPurchase]);

  const handlePurchaseError = useCallback(purchaseError => {
    setPurchasingProduct(null);
    if (purchaseError.code !== ErrorCode.UserCancelled) {
      setError(purchaseError.message || 'Google Play purchase failed.');
    }
  }, []);

  const {
    connected: storeConnected,
    products,
    availablePurchases = [],
    fetchProducts,
    getAvailablePurchases,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess: handlePurchaseSuccess,
    onPurchaseError: handlePurchaseError,
    onError: storeError => setError(
      storeError.message || 'Unable to connect to Google Play.',
    ),
  });

  useEffect(() => {
    if (isFocused && isAuthenticated) {
      refreshEconomy();
    }
  }, [isAuthenticated, isFocused, refreshEconomy]);

  useEffect(() => {
    if (!storeConnected || Platform.OS !== 'android') {
      return;
    }
    fetchProducts({
      skus: PLAY_STORE_PACKAGES.map(item => item.productId),
      type: 'in-app',
    }).catch(storeError => {
      setError(storeError.message || 'Unable to load Google Play packages.');
    });
    getAvailablePurchases().catch(storeError => {
      setError(storeError.message || 'Unable to restore pending purchases.');
    });
  }, [fetchProducts, getAvailablePurchases, storeConnected]);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS !== 'android') {
      return;
    }
    availablePurchases
      .filter(purchase => purchase.purchaseState === 'purchased')
      .forEach(purchase => {
        processPurchase(purchase).catch(purchaseError => {
          setError(
            purchaseError.message ||
              'A pending purchase could not be verified yet.',
          );
        });
      });
  }, [availablePurchases, isAuthenticated, processPurchase]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const openShop = useCallback(async () => {
    setShopVisible(true);
    await refreshEconomy();
  }, [refreshEconomy]);

  const handleClaim = useCallback(async () => {
    setBusyAction('daily');
    setError(null);
    try {
      const claimedEconomy = await claimDailyReward();
      setEconomy(claimedEconomy);
    } catch (claimError) {
      setError(claimError.message || 'Unable to claim today’s reward.');
      await refreshEconomy();
    } finally {
      setBusyAction(null);
    }
  }, [refreshEconomy]);

  const handleRedeem = useCallback(async itemId => {
    setBusyAction(itemId);
    setError(null);
    try {
      setEconomy(await redeemEconomyItem(itemId));
    } catch (redeemError) {
      setError(redeemError.message || 'Unable to redeem this item.');
      await refreshEconomy();
    } finally {
      setBusyAction(null);
    }
  }, [refreshEconomy]);

  const handlePurchase = useCallback(async productId => {
    if (!isAuthenticated) {
      setError('Sign in to purchase Gapes.');
      return;
    }
    if (!storeConnected) {
      setError('Google Play is not available on this device.');
      return;
    }

    setPurchasingProduct(productId);
    setError(null);
    try {
      await requestPurchase({
        request: { google: { skus: [productId] } },
        type: 'in-app',
      });
    } catch (purchaseError) {
      setPurchasingProduct(null);
      setError(purchaseError.message || 'Unable to start the purchase.');
    }
  }, [isAuthenticated, requestPurchase, storeConnected]);

  const renderShopContents = () => {
    const rewardDay = economy?.next_login_reward_day ?? 1;
    const rewards = economy?.login_rewards ?? [50, 100, 150, 200, 250, 300, 500];
    const catalog = economy?.catalog ?? [];
    const inventory = economy?.inventory ?? {};

    return (
      <>
        <View style={styles.shopSection}>
          <Text style={styles.sectionTitle}>WEEKLY LOGIN BOARD</Text>
          <Text style={styles.sectionDescription}>
            Claim one reward each day. Missing more than 48 hours resets your
            streak.
          </Text>
          <View style={styles.rewardGrid}>
            {rewards.map((reward, index) => {
              const day = index + 1;
              const isClaimed =
                day === economy?.last_login_reward_day &&
                economy?.claimed_today;
              const isActive =
                day === rewardDay && !economy?.claimed_today;
              return (
                <View
                  key={day}
                  style={[
                    styles.rewardCard,
                    isClaimed && styles.rewardClaimed,
                    isActive && styles.rewardActive,
                  ]}
                >
                  <Text style={styles.rewardDay}>DAY {day}</Text>
                  <MaterialIcons
                    color={isClaimed ? '#f0ce3c' : '#8b8b98'}
                    name={isClaimed ? 'check-circle' : 'monetization-on'}
                    size={20}
                  />
                  <Text style={styles.rewardAmount}>{reward}</Text>
                </View>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!isAuthenticated || economy?.claimed_today || busyAction !== null}
            onPress={handleClaim}
            style={[
              styles.primaryButton,
              (!isAuthenticated || economy?.claimed_today || busyAction !== null) &&
                styles.disabledButton,
            ]}
          >
            {busyAction === 'daily' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {!isAuthenticated
                  ? 'SIGN IN TO CLAIM'
                  : economy?.claimed_today
                    ? 'CLAIMED TODAY'
                    : `CLAIM DAY ${rewardDay}`}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.shopSection}>
          <Text style={styles.sectionTitle}>GAPES STORE</Text>
          {catalog.length ? catalog.map(item => {
            const owned = Boolean(inventory[item.id]);
            return (
              <View key={item.id} style={styles.storeRow}>
                <View style={styles.storeItem}>
                  <Text style={styles.storeItemName}>{item.name}</Text>
                  <Text style={styles.storeItemPrice}>
                    {item.price} Gapes
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={
                    !isAuthenticated ||
                    owned ||
                    busyAction !== null ||
                    (economy?.gapes_balance ?? 0) < item.price
                  }
                  onPress={() => handleRedeem(item.id)}
                  style={[
                    styles.smallButton,
                    (owned ||
                      !isAuthenticated ||
                      busyAction !== null ||
                      (economy?.gapes_balance ?? 0) < item.price) &&
                      styles.disabledButton,
                  ]}
                >
                  {busyAction === item.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.smallButtonText}>
                      {owned ? 'OWNED' : 'REDEEM'}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          }) : (
            <Text style={styles.sectionDescription}>Loading rewards…</Text>
          )}
        </View>

        <View style={styles.shopSection}>
          <Text style={styles.sectionTitle}>BUY GAPES</Text>
          <Text style={styles.sectionDescription}>
            Purchases are verified by the game server before your balance is
            updated.
          </Text>
          {PLAY_STORE_PACKAGES.map(item => {
            const product = products.find(entry => entry.id === item.productId);
            return (
              <View key={item.productId} style={styles.storeRow}>
                <View style={styles.storeItem}>
                  <Text style={styles.storeItemName}>
                    {item.gapes.toLocaleString()} Gapes
                  </Text>
                  <Text style={styles.storeItemPrice}>
                    {product?.displayPrice ?? (
                      item.productId === 'gapes_099' ? '$0.99' : '$4.99'
                    )}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={
                    !isAuthenticated ||
                    !storeConnected ||
                    !product ||
                    purchasingProduct !== null
                  }
                  onPress={() => handlePurchase(item.productId)}
                  style={[
                    styles.smallButton,
                    (!isAuthenticated ||
                      !storeConnected ||
                      !product ||
                      purchasingProduct !== null) &&
                      styles.disabledButton,
                  ]}
                >
                  {purchasingProduct === item.productId ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.smallButtonText}>
                      {product ? 'BUY' : 'NOT CONFIGURED'}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
          {!storeConnected ? (
            <Text style={styles.sectionDescription}>
              Connect to Google Play to load purchase packages.
            </Text>
          ) : Platform.OS !== 'android' ? (
            <Text style={styles.sectionDescription}>
              Gapes purchases are currently available on Android only.
            </Text>
          ) : null}
        </View>
      </>
    );
  };

  const renderPage = () => {
    if (activePage === 'lobby') {
      return children;
    }
    if (activePage === 'store') {
      return (
        <ScrollView
          contentContainerStyle={styles.shopContent}
          showsVerticalScrollIndicator={false}
        >
          {renderShopContents()}
        </ScrollView>
      );
    }
    return (
      <View style={styles.placeholderPage}>
        <MaterialIcons
          color="#f0ce3c"
          name={
            activePage === 'skin'
              ? 'palette'
              : activePage === 'social'
                ? 'people'
                : 'event'
          }
          size={52}
        />
        <Text style={styles.placeholderTitle}>
          {activePage === 'skin'
            ? 'Skin'
            : activePage === 'social'
              ? 'Social'
              : 'Events'}
        </Text>
        <Text style={styles.placeholderDescription}>
          {activePage === 'skin'
            ? 'Your board and pawn styles will appear here.'
            : activePage === 'social'
              ? 'Create or join a room from the Lobby to play with friends.'
              : 'New events and rewards will appear here.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="User profile"
          accessibilityRole="button"
          onPress={onProfilePress}
          style={styles.playerIdentity}
        >
          <View style={styles.avatarFrame}>
            <MaterialIcons color="#fff4b0" name="person" size={25} />
          </View>
          <Text numberOfLines={1} style={styles.playerName}>
            {username || (isAuthenticated ? 'Player' : 'Guest')}
          </Text>
        </Pressable>
        <View style={styles.headerActions}>
          <View style={styles.balancePill}>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <MaterialIcons color="#ffd84d" name="monetization-on" size={23} />
            </Animated.View>
            <Text numberOfLines={1} style={styles.balanceText}>
              {economy ? economy.gapes_balance.toLocaleString() : '---'}
            </Text>
            {loadingEconomy ? (
              <ActivityIndicator color="#f0ce3c" size="small" />
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Add Gapes"
            accessibilityRole="button"
            onPress={openShop}
            style={styles.addCurrencyButton}
          >
            <MaterialIcons color="#fff" name="add" size={24} />
          </Pressable>
          <Pressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            onPress={onOpenSettings}
            style={styles.settingsButton}
          >
            <MaterialIcons color="#fff4b0" name="settings" size={24} />
          </Pressable>
        </View>
      </View>

      <View style={styles.pageContent}>{renderPage()}</View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.bottomDock}>
        {NAV_ITEMS.map(item => {
          const active = activePage === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityLabel={`Navigate to ${item.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setActivePage(item.id);
                if (item.id === 'store') {
                  refreshEconomy();
                }
              }}
              style={styles.navButton}
            >
              <MaterialIcons
                color={active ? '#f0ce3c' : '#b6b3c4'}
                name={item.icon}
                size={23}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
              {active ? <View style={styles.activeMarker} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setShopVisible(false)}
        transparent
        visible={shopVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Gapes & Rewards</Text>
                <Text style={styles.modalBalance}>
                  Balance: {economy?.gapes_balance?.toLocaleString() ?? '---'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close Gapes shop"
                accessibilityRole="button"
                onPress={() => setShopVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons color="#fff" name="close" size={25} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {renderShopContents()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  topBar: {
    minHeight: 62,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(38, 29, 100, 0.88)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(240, 206, 60, 0.68)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  playerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginRight: 5,
  },
  avatarFrame: {
    width: 39,
    height: 39,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f0ce3c',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    color: '#fff',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  balancePill: {
    minWidth: 94,
    maxWidth: 116,
    height: 36,
    paddingHorizontal: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 230, 120, 0.88)',
    backgroundColor: 'rgba(25, 24, 58, 0.88)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 4,
  },
  balanceText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    flexShrink: 1,
  },
  addCurrencyButton: {
    width: 32,
    height: 32,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#fff1aa',
    backgroundColor: '#ed8b26',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  settingsButton: {
    width: 34,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageContent: {
    flex: 1,
  },
  bottomDock: {
    minHeight: 66,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240, 206, 60, 0.55)',
    backgroundColor: 'rgba(15, 12, 41, 0.96)',
    flexDirection: 'row',
    paddingHorizontal: 2,
  },
  navButton: {
    flex: 1,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 6,
  },
  navLabel: {
    color: '#b6b3c4',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  navLabelActive: {
    color: '#f0ce3c',
  },
  activeMarker: {
    position: 'absolute',
    top: 0,
    width: '82%',
    height: 2,
    backgroundColor: '#f0ce3c',
  },
  shopContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 18,
  },
  shopSection: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 206, 60, 0.7)',
    backgroundColor: 'rgba(15, 12, 41, 0.91)',
  },
  sectionTitle: {
    color: '#f0ce3c',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.6,
  },
  sectionDescription: {
    color: '#dedce8',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
    marginBottom: 10,
  },
  rewardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  rewardCard: {
    width: '13.2%',
    minHeight: 75,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#625d6e',
    backgroundColor: '#252137',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardClaimed: {
    borderColor: '#f0ce3c',
    backgroundColor: '#473d1c',
  },
  rewardActive: {
    borderColor: '#fff',
    borderWidth: 2,
  },
  rewardDay: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 3,
  },
  rewardAmount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  primaryButton: {
    minHeight: 44,
    marginTop: 13,
    borderRadius: 11,
    backgroundColor: '#b52228',
    borderWidth: 1,
    borderColor: '#f0ce3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  storeRow: {
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeItem: {
    flex: 1,
  },
  storeItemName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  storeItemPrice: {
    color: '#f0ce3c',
    fontSize: 12,
    marginTop: 3,
  },
  smallButton: {
    minWidth: 94,
    minHeight: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#f0ce3c',
    backgroundColor: '#b52228',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  placeholderPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  placeholderTitle: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 28,
    marginTop: 12,
  },
  placeholderDescription: {
    color: '#dedce8',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  error: {
    color: '#ffc1c1',
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(15, 12, 41, 0.9)',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  modalCard: {
    maxHeight: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#f0ce3c',
    backgroundColor: '#17142b',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 22,
  },
  modalBalance: {
    color: '#f0ce3c',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 3,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
});

export default EconomyHud;
