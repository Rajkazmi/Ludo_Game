import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { signOut } from '@firebase/auth';
import { useDispatch } from 'react-redux';
import Wrapper from '../Components/Wrapper';
import { auth } from '../config/firebase';
import { resetAndNavigate } from '../helpers/NavigationUtil';
import {
  deletePlayerAccount,
  getPlayerDashboard,
  getUserProfile,
  savePlayerCustomization,
  savePlayerPreferences,
  updateUsername,
} from '../services/profileService';
import { clearUserProfile, setUserProfile } from '../redux/profileSlice';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

const STAT_CARDS = [
  { key: 'totalMatchesPlayed', label: 'MATCHES' },
  { key: 'totalWins', label: 'WINS' },
  { key: 'totalLosses', label: 'LOSSES' },
  { key: 'currentWinStreak', label: 'WIN STREAK' },
  { key: 'pawnsCaptured', label: 'PAWNS CAPTURED' },
  { key: 'sixesRolled', label: 'SIXES ROLLED' },
];

const providerLabel = providerId => {
  if (providerId === 'google.com') {
    return 'Google';
  }
  if (providerId === 'facebook.com') {
    return 'Facebook';
  }
  if (providerId === 'password') {
    return 'Email & password';
  }
  return providerId;
};

const Section = ({ children, title }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const DataRow = ({ label, value }) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}</Text>
    <Text style={styles.dataValue}>{value}</Text>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [dashboard, setDashboard] = useState(null);
  const [privateProfile, setPrivateProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [winRate, setWinRate] = useState(0);

  const user = auth.currentUser;
  const linkedProviders = useMemo(
    () => user?.providerData.map(provider => providerLabel(provider.providerId)) ?? [],
    [user],
  );
  const unlockedItems = dashboard?.collectibles?.ownedItems ?? [];
  const hasClassicFrame = unlockedItems.includes('classic_frame');

  const loadDashboard = useCallback(async () => {
    if (!auth.currentUser) {
      await resetAndNavigate('LoginScreen');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextDashboard, profile] = await Promise.all([
        getPlayerDashboard(),
        getUserProfile(),
      ]);
      if (!nextDashboard.profile || !profile) {
        await resetAndNavigate('ProfileSetupScreen');
        return;
      }

      setDashboard(nextDashboard);
      setPrivateProfile(profile);
      setUsernameDraft(profile.username);
      dispatch(setUserProfile({ uid: auth.currentUser.uid, profile }));
      const played = nextDashboard.stats.totalMatchesPlayed;
      setWinRate(
        played > 0
          ? Math.round((nextDashboard.stats.totalWins / played) * 100)
          : 0,
      );
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSaveUsername = async () => {
    const username = usernameDraft.trim();
    if (!USERNAME_PATTERN.test(username)) {
      setError('Use 3-20 letters, numbers, or underscores for your name.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updatedProfile = await updateUsername(username);
      setPrivateProfile(updatedProfile);
      dispatch(setUserProfile({ uid: user.uid, profile: updatedProfile }));
      setDashboard(current => ({
        ...current,
        profile: { ...current.profile, username: updatedProfile.username },
      }));
      setUsernameModalVisible(false);
    } catch (saveError) {
      setError(saveError.message || 'Unable to update your display name.');
    } finally {
      setSaving(false);
    }
  };

  const handleCustomization = async changes => {
    if (!dashboard) {
      return;
    }
    const customization = { ...dashboard.customization, ...changes };
    setSaving(true);
    setError(null);
    try {
      const updated = await savePlayerCustomization(customization);
      setDashboard(current => ({ ...current, customization: updated }));
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this selection.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferences = async changes => {
    if (!dashboard) {
      return;
    }
    const preferences = { ...dashboard.preferences, ...changes };
    setDashboard(current => ({ ...current, preferences }));
    setError(null);
    try {
      const saved = await savePlayerPreferences(preferences);
      setDashboard(current => ({ ...current, preferences: saved }));
    } catch (saveError) {
      setDashboard(current => ({
        ...current,
        preferences: dashboard.preferences,
      }));
      setError(saveError.message || 'Unable to save profile visibility settings.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'You can sign in again at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        onPress: async () => {
          try {
            await signOut(auth);
            dispatch(clearUserProfile());
            await resetAndNavigate('LoginScreen');
          } catch (logoutError) {
            setError(logoutError.message || 'Unable to log out.');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account permanently?',
      'This deletes your profile, Gapes balance, progression, statistics, and hosted rooms. Your seat and pending requests will be removed from other rooms. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            setError(null);
            try {
              await deletePlayerAccount();
              dispatch(clearUserProfile());
              await resetAndNavigate('LoginScreen');
            } catch (deleteError) {
              setError(
                deleteError.message ||
                  'Unable to delete your account. Sign in again and retry.',
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const sharePlayerId = async () => {
    if (!dashboard?.playerId) {
      return;
    }
    try {
      await Share.share({
        message: `Add me on Ludo Kingdom: #${dashboard.playerId}`,
      });
    } catch (shareError) {
      setError(shareError.message || 'Unable to share your player code.');
    }
  };

  const copyPlayerId = () => {
    if (dashboard?.playerId) {
      Clipboard.setString(`#${dashboard.playerId}`);
      Alert.alert('Copied', 'Your player ID is ready to share.');
    }
  };

  const renderAvatar = () => {
    if (dashboard?.customization.avatar === 'provider' && user?.photoURL) {
      return (
        <Image
          source={{ uri: user.photoURL }}
          style={styles.avatarImage}
        />
      );
    }
    return (
      <MaterialIcons color="#ffe27a" name="person" size={60} />
    );
  };

  if (loading) {
    return (
      <Wrapper style={styles.wrapper}>
        <ActivityIndicator accessibilityLabel="Loading profile" color="#f0ce3c" size="large" />
      </Wrapper>
    );
  }

  if (!dashboard || !privateProfile) {
    return (
      <Wrapper style={styles.wrapper}>
        <View style={styles.errorCard}>
          <Text style={styles.emptyTitle}>Profile unavailable</Text>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error || 'Your profile could not be loaded.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={loadDashboard}
            style={styles.primaryButton}
          >
            <Text style={styles.buttonText}>RETRY</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>BACK</Text>
          </Pressable>
        </View>
      </Wrapper>
    );
  }

  const xpProgress =
    dashboard.progression.currentLevelXp /
    dashboard.progression.xpToNextLevel;
  const stats = dashboard.stats;

  return (
    <Wrapper style={styles.wrapper}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to home"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <MaterialIcons color="#fff" name="arrow-back" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>PLAYER PROFILE</Text>
          <View style={styles.headerButton} />
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={styles.inlineError}>
            {error}
          </Text>
        ) : null}
        {saving ? (
          <ActivityIndicator color="#f0ce3c" style={styles.savingIndicator} />
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Section title="IDENTITY & CUSTOMIZATION">
            <View style={styles.identityRow}>
              <View
                style={[
                  styles.avatarFrame,
                  dashboard.customization.frame === 'classic' &&
                    styles.classicAvatarFrame,
                ]}
              >
                {renderAvatar()}
              </View>
              <View style={styles.identityDetails}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.displayName}>
                    {dashboard.profile.username}
                  </Text>
                  <Pressable
                    accessibilityLabel="Edit display name"
                    accessibilityRole="button"
                    onPress={() => {
                      setUsernameDraft(privateProfile.username);
                      setUsernameModalVisible(true);
                    }}
                    style={styles.iconButton}
                  >
                    <MaterialIcons color="#ffe27a" name="edit" size={20} />
                  </Pressable>
                </View>
                <Text style={styles.subtitle}>
                  {dashboard.customization.title}
                </Text>
                <Text style={styles.playerId}>#{dashboard.playerId}</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={copyPlayerId}
                style={styles.secondaryButton}
              >
                <MaterialIcons color="#ffe27a" name="content-copy" size={18} />
                <Text style={styles.buttonText}>COPY ID</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={sharePlayerId}
                style={styles.secondaryButton}
              >
                <MaterialIcons color="#ffe27a" name="share" size={18} />
                <Text style={styles.buttonText}>INVITE</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>PROFILE PICTURE</Text>
            <View style={styles.choiceRow}>
              {[
                { id: 'provider', label: 'Google / Facebook photo' },
                { id: 'default', label: 'Game avatar' },
              ].map(choice => (
                <ChoiceButton
                  key={choice.id}
                  label={choice.label}
                  onPress={() => handleCustomization({ avatar: choice.id })}
                  selected={dashboard.customization.avatar === choice.id}
                />
              ))}
            </View>
            <Text style={styles.fieldLabel}>AVATAR FRAME</Text>
            <View style={styles.choiceRow}>
              <ChoiceButton
                label="Classic"
                onPress={() => handleCustomization({ frame: 'default' })}
                selected={dashboard.customization.frame === 'default'}
              />
              <ChoiceButton
                disabled={!hasClassicFrame}
                label={hasClassicFrame ? 'Gold frame' : 'Gold frame · locked'}
                onPress={() => handleCustomization({ frame: 'classic' })}
                selected={dashboard.customization.frame === 'classic'}
              />
            </View>
            <Text style={styles.fieldLabel}>UNLOCKED TITLES</Text>
            <View style={styles.choiceRow}>
              {dashboard.unlockedTitles.map(title => (
                <ChoiceButton
                  key={title}
                  label={title}
                  onPress={() => handleCustomization({ title })}
                  selected={dashboard.customization.title === title}
                />
              ))}
            </View>
          </Section>

          <Section title="PLAYER PROGRESSION">
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>
                  {dashboard.progression.level}
                </Text>
                <Text style={styles.levelCaption}>LEVEL</Text>
              </View>
              <View style={styles.xpDetails}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>EXPERIENCE</Text>
                  <Text style={styles.dataValue}>
                    {dashboard.progression.currentLevelXp.toLocaleString()} /{' '}
                    {dashboard.progression.xpToNextLevel.toLocaleString()} XP
                  </Text>
                </View>
                <View style={styles.xpTrack}>
                  <View
                    style={[
                      styles.xpFill,
                      { width: `${Math.min(1, xpProgress) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.hint}>
                  XP: 50 per completed online match, plus 100 for a win.
                </Text>
              </View>
            </View>
            <DataRow
              label="VANGUARD / VIP"
              value={`${dashboard.progression.vipTier} · no VIP perks configured`}
            />
          </Section>

          <Section title="GAMEPLAY STATISTICS">
            <View style={styles.statGrid}>
              {STAT_CARDS.map(item => (
                <View key={item.key} style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {stats[item.key].toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{winRate}%</Text>
                <Text style={styles.statLabel}>WIN RATE</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.longestWinStreak.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>BEST STREAK</Text>
              </View>
            </View>
            <Text style={styles.fieldLabel}>ONLINE ROOM BREAKDOWN</Text>
            <DataRow
              label="2-player"
              value={`${stats.modes.twoPlayer.wins} W · ${stats.modes.twoPlayer.losses} L · ${stats.modes.twoPlayer.played} played`}
            />
            <DataRow
              label="3-player"
              value={`${stats.modes.threePlayer.wins} W · ${stats.modes.threePlayer.losses} L · ${stats.modes.threePlayer.played} played`}
            />
            <DataRow
              label="4-player"
              value={`${stats.modes.fourPlayer.wins} W · ${stats.modes.fourPlayer.losses} L · ${stats.modes.fourPlayer.played} played`}
            />
            <DataRow label="Team / private rooms" value="Not available yet" />
            <DataRow label="Highest coin win" value="Not tracked" />
            <Text style={styles.hint}>
              Match statistics currently include completed online rooms only.
              Local games are not uploaded to your account.
            </Text>
          </Section>

          <Section title="ECONOMY & COLLECTION">
            <DataRow
              label="Gapes"
              value={
                dashboard.gapesBalance === null
                  ? 'Not loaded'
                  : dashboard.gapesBalance.toLocaleString()
              }
            />
            <DataRow label="Gems / diamonds" value="Not available" />
            <DataRow
              label="Owned cosmetics"
              value={dashboard.collectibles.ownedCosmetics.toLocaleString()}
            />
            <DataRow label="Dice / boards / pawn totals" value="Not tracked" />
          </Section>

          <Section title="SOCIAL & COMMUNITY">
            <DataRow
              label="Friends"
              value={
                dashboard.social.friendsCount === null
                  ? 'Friend lists not available yet'
                  : dashboard.social.friendsCount.toLocaleString()
              }
            />
            <DataRow
              label="Clan / guild"
              value={dashboard.social.clan ?? 'No clan system configured'}
            />
            <Pressable
              accessibilityRole="button"
              onPress={sharePlayerId}
              style={styles.secondaryButton}
            >
              <MaterialIcons color="#ffe27a" name="person-add" size={18} />
              <Text style={styles.buttonText}>SHARE FRIEND CODE</Text>
            </Pressable>
          </Section>

          <Section title="ACCOUNT & PRIVACY">
            <DataRow
              label="Linked sign-in"
              value={linkedProviders.length ? linkedProviders.join(', ') : 'Guest'}
            />
            {!linkedProviders.length ? (
              <Text style={styles.hint}>
                This is an offline guest session. Cloud account linking is not
                available yet; local progress may be lost if app data is removed.
              </Text>
            ) : null}
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceCopy}>
                <Text style={styles.dataValue}>Public statistics</Text>
                <Text style={styles.hint}>
                  Public profile directory is not available yet.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Show statistics publicly"
                onValueChange={statsPublic =>
                  handlePreferences({ statsPublic })
                }
                thumbColor={dashboard.preferences.statsPublic ? '#fff' : '#ddd'}
                trackColor={{ false: '#686273', true: '#8a6b22' }}
                value={dashboard.preferences.statsPublic}
              />
            </View>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceCopy}>
                <Text style={styles.dataValue}>Online status</Text>
                <Text style={styles.hint}>
                  Live online presence is not available yet.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Show online status"
                onValueChange={onlineStatusVisible =>
                  handlePreferences({ onlineStatusVisible })
                }
                thumbColor={
                  dashboard.preferences.onlineStatusVisible ? '#fff' : '#ddd'
                }
                trackColor={{ false: '#686273', true: '#8a6b22' }}
                value={dashboard.preferences.onlineStatusVisible}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleLogout}
              style={styles.secondaryButton}
            >
              <MaterialIcons color="#fff" name="logout" size={19} />
              <Text style={styles.buttonText}>LOG OUT</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleDeleteAccount}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>DELETE ACCOUNT</Text>
            </Pressable>
          </Section>
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setUsernameModalVisible(false)}
        transparent
        visible={usernameModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>EDIT DISPLAY NAME</Text>
            <TextInput
              accessibilityLabel="Display name"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              onChangeText={setUsernameDraft}
              placeholder="Display name"
              placeholderTextColor="#a9a5b8"
              style={styles.usernameInput}
              value={usernameDraft}
            />
            <Text style={styles.hint}>
              {usernameDraft.length}/20 · 3-20 letters, numbers, or underscores
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setUsernameModalVisible(false)}
                style={styles.secondaryButton}
              >
                <Text style={styles.buttonText}>CANCEL</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={handleSaveUsername}
                style={styles.primaryButton}
              >
                <Text style={styles.buttonText}>SAVE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Wrapper>
  );
};

const ChoiceButton = ({ disabled = false, label, onPress, selected }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled, selected }}
    disabled={disabled}
    onPress={onPress}
    style={[
      styles.choiceButton,
      selected && styles.selectedChoice,
      disabled && styles.disabledChoice,
    ]}
  >
    <Text style={styles.choiceText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'flex-start',
  },
  page: {
    flex: 1,
    width: '100%',
  },
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(38, 29, 100, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240,206,60,0.65)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 18,
  },
  content: {
    padding: 12,
    paddingBottom: 28,
  },
  section: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(240,206,60,0.65)',
    backgroundColor: 'rgba(15,12,41,0.93)',
  },
  sectionTitle: {
    color: '#f0ce3c',
    fontFamily: 'Philosopher-Bold',
    fontSize: 16,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarFrame: {
    width: 88,
    height: 88,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: '#f0ce3c',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  classicAvatarFrame: {
    borderColor: '#ffd66e',
    borderWidth: 5,
    backgroundColor: 'rgba(153,101,21,0.28)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  identityDetails: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    flexShrink: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: '#f0ce3c',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  playerId: {
    color: '#dedce8',
    fontSize: 12,
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    columnGap: 8,
    marginBottom: 8,
  },
  secondaryButton: {
    minHeight: 40,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 7,
    marginVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(240,206,60,0.75)',
    borderRadius: 10,
    backgroundColor: 'rgba(88,63,138,0.55)',
  },
  primaryButton: {
    minHeight: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffe99a',
    backgroundColor: '#a94b2c',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  fieldLabel: {
    color: '#c4bfd2',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 10,
    marginBottom: 5,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
  },
  choiceButton: {
    minHeight: 34,
    justifyContent: 'center',
    marginBottom: 4,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  selectedChoice: {
    borderColor: '#f0ce3c',
    backgroundColor: 'rgba(240,206,60,0.2)',
  },
  disabledChoice: {
    opacity: 0.55,
  },
  choiceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#ffe27a',
    backgroundColor: 'rgba(162,91,36,0.6)',
  },
  levelNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  levelCaption: {
    color: '#fff4bd',
    fontSize: 8,
    fontWeight: '800',
  },
  xpDetails: {
    flex: 1,
    marginLeft: 12,
  },
  xpTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  xpFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#70d348',
  },
  dataRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  dataLabel: {
    flexShrink: 1,
    color: '#d8d5e1',
    fontSize: 12,
  },
  dataValue: {
    flexShrink: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 7,
  },
  statCard: {
    width: '32%',
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  statValue: {
    color: '#ffe27a',
    fontSize: 19,
    fontWeight: '900',
  },
  statLabel: {
    color: '#e5e2ef',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 3,
  },
  hint: {
    color: '#bcb8ca',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },
  preferenceRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  preferenceCopy: {
    flex: 1,
    paddingRight: 8,
  },
  deleteButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e77777',
    backgroundColor: 'rgba(120,25,35,0.35)',
  },
  deleteText: {
    color: '#ffb2b2',
    fontSize: 12,
    fontWeight: '900',
  },
  inlineError: {
    color: '#ffc1c1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(95,18,30,0.92)',
  },
  savingIndicator: {
    position: 'absolute',
    top: 62,
    right: 12,
    zIndex: 2,
  },
  errorCard: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 70,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0ce3c',
    backgroundColor: 'rgba(15,12,41,0.94)',
  },
  emptyTitle: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  errorText: {
    color: '#ffc1c1',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 10,
  },
  backButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#ffe27a',
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.76)',
  },
  modalCard: {
    width: '100%',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0ce3c',
    backgroundColor: '#17142b',
  },
  usernameInput: {
    minHeight: 48,
    marginTop: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

export default ProfileScreen;
