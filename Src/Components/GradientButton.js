import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { RFValue } from 'react-native-responsive-fontsize';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { playSound } from '../helpers/SoundUtility';

const iconsSize = RFValue(24);

const GradientButton = ({ title, onPress, iconColor = '#d5be3e' }) => {

  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.btnContainer}
        onPress={() => {
          playSound('ui');
          onPress();
        }}
      >
        <LinearGradient
          colors={['#ffffff48', '#ff0000', '#ffffff3e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {title == 'RESUME' ? (
            <MaterialIcons
              name="play-arrow"
              color={iconColor}
              size={iconsSize}
            />
          ) : title == 'NEW GAME' ? (
            <MaterialIcons
              name="play-circle"
              color={iconColor}
              size={iconsSize}
            />
          ) : title == 'VS CPU' ? (
            <MaterialIcons name="airplay" color={iconColor} size={iconsSize} />
          ) : title == 'HOME' ? (
            <MaterialIcons name="home" color={iconColor} size={iconsSize} />
          ) : (
            <MaterialIcons name="person-4" color={iconColor} size={iconsSize} />
          )}
          <Text style={styles.buttonText}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00000030',
    marginVertical: 10,
  },
  btnContainer: {
    borderWidth: 2,
    borderRadius: 20,
    elevation: 5,
    backgroundColor: '#fff81e53',
    shadowColor: '#fff82a',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    borderColor: '#ffe34774',
    width: 220,
  },
  buttonText: {
    fontSize: RFValue(16),
    color: 'white',
    width: '70%',
    textAlign: 'center',
    fontFamily: 'Philosopher-Bold',
  },

  button: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d5be3e',
    flexDirection: 'row',
    gap: 20,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',

  },
  icon: {
    marginRight: 12,
  },
});

export default GradientButton;
