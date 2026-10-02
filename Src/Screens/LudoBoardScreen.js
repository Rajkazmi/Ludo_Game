import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { deviceHeight, deviceWidth } from '../constants/Scaling';
import Wrapper from '../Components/Wrapper';
import MenuModal from '../Components/MenuModal';
import MenuIcon from '../assets/images/menu.png';
import { playSound } from '../helpers/SoundUtility';
import StartGame from '../assets/images/start.png';
import { useIsFocused } from '@react-navigation/native';
import {
  selectDiceTouch,
  selectPlayer1,
  selectPlayer2,
  selectPlayer3,
  selectPlayer4,
} from '../redux/reducers/gameSelector';
import { useSelector } from 'react-redux';
import Dice from '../Components/Dice';
import HorizontalPath from '../Components/path/HorizontalPath';
import VerticalPath from '../Components/path/VerticalPath';
import Pocket from '../Components/Pocket';
import FourTriangles from '../Components/FourTriangles';
import WinModal from '../Components/WinModal';
import { Colors } from '../constants/Colors';
import { Plot1Data, Plot2Data, Plot3Data, Plot4Data } from '../helpers/PlotData';

const LudoBoardScreen = () => {
  const player1 = useSelector(selectPlayer1);
  const player2 = useSelector(selectPlayer2);
  const player3 = useSelector(selectPlayer3);
  const player4 = useSelector(selectPlayer4);
  const isDiceTouch = useSelector(selectDiceTouch);
  const winner = useSelector(state => state.game.winner);

  const isFocused = useIsFocused();
  const opacity = useRef(new Animated.Value(1)).current;

  const [menuVisible, setMenuVisible] = useState(false);
  const [showStartGame, setShowStartImage] = useState(false);

  const handleMenuPress = useCallback(() => {
    playSound('ui');
    setMenuVisible(true);
  }, []);

  useEffect(() => {
    if (isFocused) {
      setShowStartImage(true);
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );

      blinkAnimation.start();

      const timeout = setTimeout(() => {
        blinkAnimation.stop();
        setShowStartImage(false);
      }, 2500);
      // Cleanup animation on component unmounts or when focus lost 
      return () => {
        blinkAnimation.stop();
        clearTimeout(timeout);
      };
    }
  }, [isFocused]);

  return (
    <Wrapper style={styles.container}>
      <TouchableOpacity style={styles.menuIcon} onPress={handleMenuPress}>
        <Image source={MenuIcon} style={styles.menuIconImage} />
      </TouchableOpacity>
      <View style={styles.container}>
        <View 
        style={styles.flexRow} 
        pointerEvents={isDiceTouch ? 'none' : 'auto'}>
          <Dice color={Colors.green} player={2} data={player2} />
          <VerticalPath cells={Plot2Data} color={Colors.yellow} />
          <Dice color={Colors.yellow} player={3} rotate data={player3} />
        </View>

        <View style={styles.ludoBoard}>
          <View style={styles.plotContainer}>
            <Pocket color={Colors.green} player={2} data={player2} />
            <Pocket color={Colors.yellow} player={3} data={player3} />
          </View>
          <View style={styles.pathContainer}>
            <HorizontalPath cells={Plot1Data} color={Colors.green} />
            <FourTriangles
              player1={player1}
              player2={player2}
              player3={player3}
              player4={player4}
            />
            <HorizontalPath cells={Plot3Data} color={Colors.blue} />
          </View>

          <View style={styles.plotContainer}>
            <Pocket color={Colors.red} player={1} data={player1} />
            <VerticalPath cells={Plot4Data} color={Colors.yellow} />
            <Pocket color={Colors.blue} player={4} data={player4} />
          </View>
        </View>

        <View
          style={styles.flexRow}
          pointerEvents={isDiceTouch ? 'none' : 'auto'}
        >
          <Dice color={Colors.red} player={1} data={player1} />
          <Dice color={Colors.blue} rotate player={4} data={player4} />
        </View>
      </View>

      {showStartGame && (
        <Animated.Image
          source={StartGame}
          style={{
            width: deviceWidth * 0.5,
            height: deviceHeight * 0.5,
            position: 'absolute',
            opacity: 0.9,
          }}
        />
      )}

      {menuVisible && (
        <MenuModal
          onPressHide={() => setMenuVisible(false)}
          visible={menuVisible}
        />
      )}

      {winner != null && <WinModal winner={winner} />}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
    height: deviceHeight * 0.5,
    width: deviceWidth,
  },
  ludoBoard: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
    padding: 10,
  },
  menuIcon: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  menuIconImage: {
    width: 30,
    height: 30,
  },
  flexRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 30,
  },
  plotContainer: {
    width: '100%',
    height: '40%',
    justifyContent: 'space-between',
    flexDirection: 'row',
    backgroundColor: '#ccc',
  },
  pathContainer: {
    width: '100%',
    height: '20%',
    justifyContent: 'space-between',
    flexDirection: 'row',
    backgroundColor: '#1E5162',
  },
});

export default LudoBoardScreen;
