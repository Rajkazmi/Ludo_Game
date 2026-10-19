import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Wrapper from '../Components/Wrapper';
import { auth } from '../config/firebase';
import { resetAndNavigate } from '../helpers/NavigationUtil';
import {
  isUsernameAvailable,
  saveUserProfile,
} from '../services/profileService';
import { selectUserProfile, setUserProfile } from '../redux/profileSlice';

const GENDERS = [
  'Female',
  'Male',
  'Non-binary',
  'Other',
  'Prefer not to say',
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

const formatDate = date =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

const dateFromValue = value =>
  value ? new Date(`${value}T00:00:00`) : new Date(2000, 0, 1);

const ProfileSetupScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const storedUserProfile = useSelector(selectUserProfile);
  const uid = auth.currentUser?.uid;
  const existingProfile =
    storedUserProfile?.uid === uid ? storedUserProfile.profile : null;
  const [username, setUsername] = useState(existingProfile?.username ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(
    existingProfile?.dateOfBirth ?? '',
  );
  const [gender, setGender] = useState(existingProfile?.gender ?? '');
  const [recoveryEmail, setRecoveryEmail] = useState(
    existingProfile?.recoveryEmail ?? '',
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    const profile = {
      username: username.trim(),
      dateOfBirth,
      gender,
      recoveryEmail: recoveryEmail.trim().toLowerCase(),
    };

    if (!USERNAME_PATTERN.test(profile.username)) {
      setError(
        'Username must be 3-20 characters and use only letters, numbers, or underscores.',
      );
      return;
    }
    if (!profile.dateOfBirth || !gender) {
      setError('Complete all profile fields.');
      return;
    }
    if (!EMAIL_PATTERN.test(profile.recoveryEmail)) {
      setError('Enter a valid recovery email address.');
      return;
    }
    if (!uid) {
      setError('Sign in before creating your profile.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (!(await isUsernameAvailable(profile))) {
        setError('Username is already taken.');
        return;
      }

      const savedProfile = await saveUserProfile(profile);
      dispatch(setUserProfile({ uid, profile: savedProfile }));
      await resetAndNavigate('HomeScreen', { mode: 'online' });
    } catch (saveError) {
      setError(
        saveError.message === 'Username is already taken.'
          ? saveError.message
          : saveError.message || 'Unable to save your profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  const datePicker = (
    <DateTimePicker
      maximumDate={new Date()}
      mode="date"
      onChange={(event, date) => {
        if (date) {
          setDateOfBirth(formatDate(date));
        }
        if (Platform.OS === 'android' || event.type === 'dismissed') {
          setShowDatePicker(false);
        }
      }}
      value={dateFromValue(dateOfBirth)}
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
    />
  );

  return (
    <Wrapper style={styles.wrapper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {existingProfile ? (
              <Pressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <MaterialIcons color="#f0ce3c" name="arrow-back" size={26} />
              </Pressable>
            ) : null}
            <Text style={styles.title}>
              {existingProfile ? 'Your Profile' : 'Set Up Your Profile'}
            </Text>
            <Text style={styles.description}>
              Add your details to continue playing online.
            </Text>

            <TextInput
              accessibilityLabel="Username"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              onChangeText={value => {
                setUsername(value);
                setError(null);
              }}
              placeholder="Username"
              placeholderTextColor="#c5c5d0"
              style={styles.input}
              value={username}
            />
            <Pressable
              accessibilityLabel="Date of birth"
              accessibilityRole="button"
              onPress={() => setShowDatePicker(true)}
              style={styles.input}
            >
              <Text
                style={[
                  styles.fieldText,
                  !dateOfBirth && styles.placeholder,
                ]}
              >
                {dateOfBirth || 'Date of birth'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Gender"
              accessibilityRole="button"
              onPress={() => setShowGenderPicker(true)}
              style={styles.input}
            >
              <Text
                style={[styles.fieldText, !gender && styles.placeholder]}
              >
                {gender || 'Select gender'}
              </Text>
            </Pressable>
            <TextInput
              accessibilityLabel="Recovery email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={value => {
                setRecoveryEmail(value);
                setError(null);
              }}
              placeholder="Recovery email ID"
              placeholderTextColor="#c5c5d0"
              style={styles.input}
              value={recoveryEmail}
            />
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}

            {saving ? (
              <ActivityIndicator
                color="#f0ce3c"
                size="large"
                style={styles.loading}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={handleSubmit}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>SAVE PROFILE</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && Platform.OS === 'android' ? datePicker : null}
      <Modal
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
        transparent
        visible={showDatePicker && Platform.OS === 'ios'}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            {datePicker}
            <Pressable
              onPress={() => setShowDatePicker(false)}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>DONE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setShowGenderPicker(false)}
        transparent
        visible={showGenderPicker}
      >
        <Pressable
          onPress={() => setShowGenderPicker(false)}
          style={styles.modalBackdrop}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select gender</Text>
            {GENDERS.map(option => (
              <Pressable
                key={option}
                onPress={() => {
                  setGender(option);
                  setShowGenderPicker(false);
                }}
                style={styles.genderOption}
              >
                <Text style={styles.fieldText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
  },
  keyboard: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0ce3c',
    backgroundColor: 'rgba(15, 12, 41, 0.92)',
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 28,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    minHeight: 50,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0ce3c',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  fieldText: {
    color: '#fff',
    fontSize: 16,
  },
  placeholder: {
    color: '#c5c5d0',
  },
  error: {
    color: '#ffc1c1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  saveButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#b52228',
    borderWidth: 1,
    borderColor: '#f0ce3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loading: {
    marginVertical: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  pickerCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1a1732',
    borderColor: '#f0ce3c',
    borderWidth: 1,
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  genderOption: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#777',
  },
});

export default ProfileSetupScreen;
